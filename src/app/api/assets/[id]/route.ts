import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { assets, assetTypes, operations, portfolios, familyMembers } from "@/db/schema";
import {
  calculateQuantity,
  calculateAveragePrice,
  calculateTotalInvested,
} from "@/lib/calculations/portfolio";

async function verifyPortfolioAccess(
  db: ReturnType<typeof import("@/db").getDb>,
  portfolioId: string,
  userId: string
): Promise<boolean> {
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.id, portfolioId))
    .limit(1);

  if (!portfolio) return false;

  if (portfolio.type === "personal") {
    return portfolio.userId === userId;
  }

  if (portfolio.type === "family" && portfolio.familyId) {
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.familyId, portfolio.familyId),
          eq(familyMembers.userId, userId)
        )
      )
      .limit(1);
    return !!membership;
  }

  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Buscar ativo com tipo
    const [assetResult] = await db
      .select({
        id: assets.id,
        portfolioId: assets.portfolioId,
        assetTypeId: assets.assetTypeId,
        ticker: assets.ticker,
        name: assets.name,
        broker: assets.broker,
        currency: assets.currency,
        maturityDate: assets.maturityDate,
        indexer: assets.indexer,
        indexerRate: assets.indexerRate,
        isActive: assets.isActive,
        stopGainPrice: assets.stopGainPrice,
        stopLossPrice: assets.stopLossPrice,
        currentValue: assets.currentValue,
        currentValueUpdatedAt: assets.currentValueUpdatedAt,
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
      })
      .from(assets)
      .innerJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(eq(assets.id, id))
      .limit(1);

    if (!assetResult) {
      return NextResponse.json(
        { error: "Ativo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar acesso à carteira
    const hasAccess = await verifyPortfolioAccess(
      db,
      assetResult.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Buscar operações do ativo para calcular posição
    const assetOperations = await db
      .select()
      .from(operations)
      .where(eq(operations.assetId, id));

    const totalQuantity = calculateQuantity(assetOperations);
    const averagePrice = calculateAveragePrice(assetOperations);
    const totalInvested = calculateTotalInvested(assetOperations);
    const currentValue = assetResult.currentValue !== null
      ? assetResult.currentValue
      : totalQuantity * averagePrice;
    const profitLoss = currentValue - totalInvested;

    return NextResponse.json({
      asset: assetResult,
      position: {
        totalQuantity,
        averagePrice,
        totalInvested,
        currentValue,
        profitLoss,
      },
      operations: assetOperations,
    });
  } catch (error) {
    console.error("Erro ao buscar ativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as any;
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verificar se o ativo existe
    const [existing] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Ativo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar acesso
    const hasAccess = await verifyPortfolioAccess(
      db,
      existing.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    await db
      .update(assets)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.ticker !== undefined && { ticker: body.ticker || null }),
        ...(body.broker !== undefined && { broker: body.broker || null }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.maturityDate !== undefined && {
          maturityDate: body.maturityDate || null,
        }),
        ...(body.indexer !== undefined && { indexer: body.indexer || null }),
        ...(body.indexerRate !== undefined && {
          indexerRate: body.indexerRate ?? null,
        }),
        ...(body.stopGainPrice !== undefined && {
          stopGainPrice: body.stopGainPrice ?? null,
        }),
        ...(body.stopLossPrice !== undefined && {
          stopLossPrice: body.stopLossPrice ?? null,
        }),
        ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
        ...(body.currentValueUpdatedAt !== undefined && { currentValueUpdatedAt: body.currentValueUpdatedAt }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.assetTypeId !== undefined && {
          assetTypeId: body.assetTypeId,
        }),
        updatedAt: now,
      })
      .where(eq(assets.id, id));

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Erro ao atualizar ativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verificar se o ativo existe
    const [existing] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Ativo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar acesso
    const hasAccess = await verifyPortfolioAccess(
      db,
      existing.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Soft delete
    const now = new Date().toISOString();
    await db
      .update(assets)
      .set({ isActive: 0, updatedAt: now })
      .where(eq(assets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir ativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
