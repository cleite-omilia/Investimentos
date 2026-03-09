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
    const year = searchParams.get("year") || new Date().getFullYear().toString();

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

    // Buscar todas as fontes de contribuição da carteira
    const sources = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.portfolioId, portfolioId));

    // Para cada fonte, buscar as previsões do ano solicitado
    const sourcesWithForecasts = await Promise.all(
      sources.map(async (source) => {
        const allForecasts = await db
          .select()
          .from(contributionForecasts)
          .where(eq(contributionForecasts.sourceId, source.id));

        // Filtrar apenas as do ano solicitado e montar array de 12 meses
        const yearForecasts = allForecasts.filter((f) =>
          f.yearMonth.startsWith(year)
        );

        const months = Array.from({ length: 12 }, (_, i) => {
          const month = String(i + 1).padStart(2, "0");
          const yearMonth = `${year}-${month}`;
          const forecast = yearForecasts.find((f) => f.yearMonth === yearMonth);
          return {
            yearMonth,
            amount: forecast?.amount ?? 0,
            id: forecast?.id ?? null,
          };
        });

        return {
          ...source,
          forecasts: months,
        };
      })
    );

    return NextResponse.json({ sources: sourcesWithForecasts });
  } catch (error) {
    console.error("Erro ao buscar fontes de contribuição:", error);
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
    const { portfolioId, name } = body;

    if (!portfolioId || !name) {
      return NextResponse.json(
        { error: "portfolioId e name são obrigatórios" },
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

    await db.insert(contributionSources).values({
      id,
      portfolioId,
      name,
      createdAt: now,
      updatedAt: now,
    });

    const [source] = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.id, id))
      .limit(1);

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar fonte de contribuição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
