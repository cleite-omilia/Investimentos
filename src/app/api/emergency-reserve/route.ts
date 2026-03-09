import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { emergencyReserves, portfolios, familyMembers } from "@/db/schema";

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

    const [reserve] = await db
      .select()
      .from(emergencyReserves)
      .where(eq(emergencyReserves.portfolioId, portfolioId))
      .limit(1);

    return NextResponse.json({ reserve: reserve || null });
  } catch (error) {
    console.error("Erro ao buscar reserva de emergência:", error);
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
    const { portfolioId, targetAmount, currentAmount, notes } = body;

    if (!portfolioId || targetAmount === undefined || currentAmount === undefined) {
      return NextResponse.json(
        { error: "portfolioId, targetAmount e currentAmount são obrigatórios" },
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

    const now = new Date().toISOString();

    // Verificar se já existe reserva para esta carteira
    const [existing] = await db
      .select()
      .from(emergencyReserves)
      .where(eq(emergencyReserves.portfolioId, portfolioId))
      .limit(1);

    if (existing) {
      // Atualizar reserva existente
      await db
        .update(emergencyReserves)
        .set({
          targetAmount,
          currentAmount,
          notes: notes ?? existing.notes,
          updatedAt: now,
        })
        .where(eq(emergencyReserves.id, existing.id));

      const [reserve] = await db
        .select()
        .from(emergencyReserves)
        .where(eq(emergencyReserves.id, existing.id))
        .limit(1);

      return NextResponse.json({ reserve });
    } else {
      // Criar nova reserva
      const id = crypto.randomUUID();

      await db.insert(emergencyReserves).values({
        id,
        portfolioId,
        targetAmount,
        currentAmount,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      });

      const [reserve] = await db
        .select()
        .from(emergencyReserves)
        .where(eq(emergencyReserves.id, id))
        .limit(1);

      return NextResponse.json({ reserve }, { status: 201 });
    }
  } catch (error) {
    console.error("Erro ao salvar reserva de emergência:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
