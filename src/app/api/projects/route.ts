import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  projects,
  projectProvisions,
  portfolios,
  familyMembers,
} from "@/db/schema";

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

    const hasAccess = await verifyPortfolioAccess(
      db,
      portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado a esta carteira" },
        { status: 403 }
      );
    }

    // Buscar projetos com total de provisões
    const result = await db
      .select({
        id: projects.id,
        portfolioId: projects.portfolioId,
        name: projects.name,
        targetAmount: projects.targetAmount,
        targetDate: projects.targetDate,
        recurrence: projects.recurrence,
        recurrenceMonth: projects.recurrenceMonth,
        isRetirement: projects.isRetirement,
        retirementMonthlyWithdrawal: projects.retirementMonthlyWithdrawal,
        ipcaRate: projects.ipcaRate,
        priority: projects.priority,
        status: projects.status,
        currentAmount: projects.currentAmount,
        notes: projects.notes,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        totalProvisioned: sql<number>`coalesce(sum(${projectProvisions.amount}), 0)`.as(
          "totalProvisioned"
        ),
      })
      .from(projects)
      .leftJoin(
        projectProvisions,
        eq(projects.id, projectProvisions.projectId)
      )
      .where(eq(projects.portfolioId, portfolioId))
      .groupBy(projects.id)
      .orderBy(projects.priority);

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
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
      name,
      targetAmount,
      targetDate,
      recurrence,
      recurrenceMonth,
      isRetirement,
      retirementMonthlyWithdrawal,
      ipcaRate,
      priority,
      notes,
    } = body;

    if (!portfolioId || !name || targetAmount === undefined) {
      return NextResponse.json(
        { error: "portfolioId, name e targetAmount são obrigatórios" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const hasAccess = await verifyPortfolioAccess(
      db,
      portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado a esta carteira" },
        { status: 403 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(projects).values({
      id,
      portfolioId,
      name,
      targetAmount,
      targetDate: targetDate || null,
      recurrence: recurrence || "once",
      recurrenceMonth: recurrenceMonth ?? null,
      isRetirement: isRetirement ?? 0,
      retirementMonthlyWithdrawal: retirementMonthlyWithdrawal ?? null,
      ipcaRate: ipcaRate ?? null,
      priority: priority ?? 0,
      status: "active",
      currentAmount: 0,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
