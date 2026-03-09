import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { assets, assetTypes, portfolios, familyMembers } from "@/db/schema";

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");

    if (!portfolioId) {
      return NextResponse.json(
        { error: "portfolioId é obrigatório" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const hasAccess = await verifyPortfolioAccess(db, portfolioId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado a esta carteira" },
        { status: 403 }
      );
    }

    const result = await db
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
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
      })
      .from(assets)
      .innerJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(
        and(
          eq(assets.portfolioId, portfolioId),
          eq(assets.isActive, 1)
        )
      );

    return NextResponse.json({ assets: result });
  } catch (error) {
    console.error("Erro ao buscar ativos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    const {
      portfolioId,
      assetTypeId,
      ticker,
      name,
      broker,
      currency,
      maturityDate,
      indexer,
      indexerRate,
      stopGainPrice,
      stopLossPrice,
      notes,
    } = body;

    if (!portfolioId || !assetTypeId || !name) {
      return NextResponse.json(
        { error: "portfolioId, assetTypeId e name são obrigatórios" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const hasAccess = await verifyPortfolioAccess(db, portfolioId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado a esta carteira" },
        { status: 403 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(assets).values({
      id,
      portfolioId,
      assetTypeId,
      ticker: ticker || null,
      name,
      broker: broker || null,
      currency: currency || "BRL",
      maturityDate: maturityDate || null,
      indexer: indexer || null,
      indexerRate: indexerRate ?? null,
      stopGainPrice: stopGainPrice ?? null,
      stopLossPrice: stopLossPrice ?? null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar ativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
