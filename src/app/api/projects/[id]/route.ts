import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, desc } from "drizzle-orm";
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

    // Buscar projeto
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado" },
        { status: 404 }
      );
    }

    // Verificar acesso à carteira
    const hasAccess = await verifyPortfolioAccess(
      db,
      project.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Buscar provisões do projeto
    const provisions = await db
      .select()
      .from(projectProvisions)
      .where(eq(projectProvisions.projectId, id))
      .orderBy(desc(projectProvisions.date));

    return NextResponse.json({ project, provisions });
  } catch (error) {
    console.error("Erro ao buscar projeto:", error);
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

    // Verificar se o projeto existe
    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Projeto não encontrado" },
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
      .update(projects)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.targetAmount !== undefined && {
          targetAmount: body.targetAmount,
        }),
        ...(body.targetDate !== undefined && {
          targetDate: body.targetDate || null,
        }),
        ...(body.recurrence !== undefined && { recurrence: body.recurrence }),
        ...(body.recurrenceMonth !== undefined && {
          recurrenceMonth: body.recurrenceMonth ?? null,
        }),
        ...(body.isRetirement !== undefined && {
          isRetirement: body.isRetirement,
        }),
        ...(body.retirementMonthlyWithdrawal !== undefined && {
          retirementMonthlyWithdrawal:
            body.retirementMonthlyWithdrawal ?? null,
        }),
        ...(body.ipcaRate !== undefined && {
          ipcaRate: body.ipcaRate ?? null,
        }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.currentAmount !== undefined && {
          currentAmount: body.currentAmount,
        }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        updatedAt: now,
      })
      .where(eq(projects.id, id));

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Erro ao atualizar projeto:", error);
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

    // Verificar se o projeto existe
    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Projeto não encontrado" },
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

    // Soft delete - marcar como cancelado
    const now = new Date().toISOString();
    await db
      .update(projects)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao cancelar projeto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
