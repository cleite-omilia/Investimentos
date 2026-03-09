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

    // Buscar projeto para verificar acesso
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

    const provisions = await db
      .select()
      .from(projectProvisions)
      .where(eq(projectProvisions.projectId, id))
      .orderBy(desc(projectProvisions.date));

    return NextResponse.json({ provisions });
  } catch (error) {
    console.error("Erro ao buscar provisões:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { date, amount } = body;

    if (!date || amount === undefined) {
      return NextResponse.json(
        { error: "date e amount são obrigatórios" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Buscar projeto para verificar acesso
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

    const provisionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(projectProvisions).values({
      id: provisionId,
      projectId: id,
      date,
      amount,
      source: "manual",
      createdAt: now,
    });

    // Atualizar currentAmount do projeto
    await db
      .update(projects)
      .set({
        currentAmount: project.currentAmount + amount,
        updatedAt: now,
      })
      .where(eq(projects.id, id));

    const [provision] = await db
      .select()
      .from(projectProvisions)
      .where(eq(projectProvisions.id, provisionId))
      .limit(1);

    return NextResponse.json({ provision }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar provisão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
