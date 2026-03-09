import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { operations, assets, portfolios, familyMembers } from "@/db/schema";

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
    const assetId = searchParams.get("assetId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

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

    // Construir condições de filtro
    const conditions = [eq(operations.portfolioId, portfolioId)];

    if (assetId) {
      conditions.push(eq(operations.assetId, assetId));
    }
    if (type) {
      conditions.push(eq(operations.type, type));
    }
    if (from) {
      conditions.push(gte(operations.date, from));
    }
    if (to) {
      conditions.push(lte(operations.date, to));
    }

    const result = await db
      .select({
        id: operations.id,
        portfolioId: operations.portfolioId,
        assetId: operations.assetId,
        type: operations.type,
        date: operations.date,
        quantity: operations.quantity,
        unitPrice: operations.unitPrice,
        totalAmount: operations.totalAmount,
        fees: operations.fees,
        brokerFrom: operations.brokerFrom,
        brokerTo: operations.brokerTo,
        splitFactor: operations.splitFactor,
        notes: operations.notes,
        createdAt: operations.createdAt,
        updatedAt: operations.updatedAt,
        assetName: assets.name,
        assetTicker: assets.ticker,
      })
      .from(operations)
      .innerJoin(assets, eq(operations.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(desc(operations.date));

    return NextResponse.json({ operations: result });
  } catch (error) {
    console.error("Erro ao buscar operações:", error);
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
      assetId,
      type,
      date,
      quantity,
      unitPrice,
      totalAmount,
      fees,
      brokerFrom,
      brokerTo,
      splitFactor,
      notes,
    } = body;

    if (!portfolioId || !assetId || !type || !date) {
      return NextResponse.json(
        { error: "portfolioId, assetId, type e date são obrigatórios" },
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

    // Verificar se o ativo pertence à carteira
    const [asset] = await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.id, assetId), eq(assets.portfolioId, portfolioId))
      )
      .limit(1);

    if (!asset) {
      return NextResponse.json(
        { error: "Ativo não encontrado nesta carteira" },
        { status: 404 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(operations).values({
      id,
      portfolioId,
      assetId,
      type,
      date,
      quantity: quantity ?? 0,
      unitPrice: unitPrice ?? 0,
      totalAmount: totalAmount ?? 0,
      fees: fees ?? 0,
      brokerFrom: brokerFrom || null,
      brokerTo: brokerTo || null,
      splitFactor: splitFactor ?? null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    return NextResponse.json({ operation }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar operação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
