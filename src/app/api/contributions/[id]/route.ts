import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  contributionSources,
  contributionForecasts,
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name é obrigatório" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verificar se a fonte existe
    const [existing] = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Fonte de contribuição não encontrada" },
        { status: 404 }
      );
    }

    // Verificar acesso à carteira
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
      .update(contributionSources)
      .set({ name, updatedAt: now })
      .where(eq(contributionSources.id, id));

    const [source] = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.id, id))
      .limit(1);

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Erro ao atualizar fonte de contribuição:", error);
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

    // Verificar se a fonte existe
    const [existing] = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Fonte de contribuição não encontrada" },
        { status: 404 }
      );
    }

    // Verificar acesso à carteira
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

    // Deletar previsões associadas primeiro, depois a fonte
    await db
      .delete(contributionForecasts)
      .where(eq(contributionForecasts.sourceId, id));

    await db
      .delete(contributionSources)
      .where(eq(contributionSources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir fonte de contribuição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
