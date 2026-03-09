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
    const { sourceId, yearMonth, amount } = body;

    if (!sourceId || !yearMonth || amount === undefined) {
      return NextResponse.json(
        { error: "sourceId, yearMonth e amount são obrigatórios" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verificar se a fonte existe
    const [source] = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.id, sourceId))
      .limit(1);

    if (!source) {
      return NextResponse.json(
        { error: "Fonte de contribuição não encontrada" },
        { status: 404 }
      );
    }

    // Verificar acesso à carteira
    const hasAccess = await verifyPortfolioAccess(
      db,
      source.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // Verificar se já existe previsão para este sourceId + yearMonth
    const [existing] = await db
      .select()
      .from(contributionForecasts)
      .where(
        and(
          eq(contributionForecasts.sourceId, sourceId),
          eq(contributionForecasts.yearMonth, yearMonth)
        )
      )
      .limit(1);

    if (existing) {
      // Atualizar previsão existente
      await db
        .update(contributionForecasts)
        .set({ amount, updatedAt: now })
        .where(eq(contributionForecasts.id, existing.id));

      const [forecast] = await db
        .select()
        .from(contributionForecasts)
        .where(eq(contributionForecasts.id, existing.id))
        .limit(1);

      return NextResponse.json({ forecast });
    } else {
      // Criar nova previsão
      const id = crypto.randomUUID();

      await db.insert(contributionForecasts).values({
        id,
        sourceId,
        yearMonth,
        amount,
        createdAt: now,
        updatedAt: now,
      });

      const [forecast] = await db
        .select()
        .from(contributionForecasts)
        .where(eq(contributionForecasts.id, id))
        .limit(1);

      return NextResponse.json({ forecast }, { status: 201 });
    }
  } catch (error) {
    console.error("Erro ao salvar previsão de contribuição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    const { forecasts } = body;

    if (!Array.isArray(forecasts) || forecasts.length === 0) {
      return NextResponse.json(
        { error: "forecasts deve ser um array não vazio" },
        { status: 400 }
      );
    }

    // Validar cada item do array
    for (const item of forecasts) {
      if (!item.sourceId || !item.yearMonth || item.amount === undefined) {
        return NextResponse.json(
          { error: "Cada previsão deve ter sourceId, yearMonth e amount" },
          { status: 400 }
        );
      }
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verificar acesso para todas as fontes envolvidas
    const sourceIds = [...new Set(forecasts.map((f: any) => f.sourceId))];
    const sources = await Promise.all(
      sourceIds.map(async (sourceId) => {
        const [source] = await db
          .select()
          .from(contributionSources)
          .where(eq(contributionSources.id, sourceId as string))
          .limit(1);
        return source;
      })
    );

    // Verificar se todas as fontes existem
    if (sources.some((s) => !s)) {
      return NextResponse.json(
        { error: "Uma ou mais fontes de contribuição não encontradas" },
        { status: 404 }
      );
    }

    // Verificar acesso a todas as carteiras envolvidas
    const portfolioIds = [...new Set(sources.map((s) => s!.portfolioId))];
    for (const portfolioId of portfolioIds) {
      const hasAccess = await verifyPortfolioAccess(
        db,
        portfolioId,
        session.user.id
      );
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Acesso negado a uma ou mais carteiras" },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();
    const results = [];

    for (const item of forecasts) {
      const { sourceId, yearMonth, amount } = item;

      // Verificar se já existe
      const [existing] = await db
        .select()
        .from(contributionForecasts)
        .where(
          and(
            eq(contributionForecasts.sourceId, sourceId),
            eq(contributionForecasts.yearMonth, yearMonth)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(contributionForecasts)
          .set({ amount, updatedAt: now })
          .where(eq(contributionForecasts.id, existing.id));

        const [updated] = await db
          .select()
          .from(contributionForecasts)
          .where(eq(contributionForecasts.id, existing.id))
          .limit(1);

        results.push(updated);
      } else {
        const id = crypto.randomUUID();

        await db.insert(contributionForecasts).values({
          id,
          sourceId,
          yearMonth,
          amount,
          createdAt: now,
          updatedAt: now,
        });

        const [created] = await db
          .select()
          .from(contributionForecasts)
          .where(eq(contributionForecasts.id, id))
          .limit(1);

        results.push(created);
      }
    }

    return NextResponse.json({ forecasts: results });
  } catch (error) {
    console.error("Erro ao salvar previsões de contribuição em lote:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
