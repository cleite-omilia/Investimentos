import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, sql, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  portfolios,
  familyMembers,
  assets,
  assetTypes,
  operations,
  projects,
  emergencyReserves,
  allocationTargets,
  contributionSources,
  contributionForecasts,
} from "@/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  renda_variavel: "Renda Variavel",
  renda_fixa: "Renda Fixa",
  fundos: "Fundos",
  cripto: "Criptomoeda",
  moeda: "Moeda",
  saldo: "Saldo",
};

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
        { error: "Nao autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");

    if (!portfolioId) {
      return NextResponse.json(
        { error: "portfolioId e obrigatorio" },
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

    // ---------------------------------------------------------------
    // 1. Asset positions: per-asset value from operations
    // ---------------------------------------------------------------
    const assetPositions = await db
      .select({
        assetId: assets.id,
        assetName: assets.name,
        assetTicker: assets.ticker,
        assetTypeId: assets.assetTypeId,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
        maturityDate: assets.maturityDate,
        totalBought: sql<number>`coalesce(sum(
          case
            when ${operations.type} in ('compra', 'aporte', 'bonificacao') then ${operations.totalAmount}
            else 0
          end
        ), 0)`.as("totalBought"),
        totalYields: sql<number>`coalesce(sum(
          case
            when ${operations.type} in ('rendimento', 'dividendo', 'jcp') then ${operations.totalAmount}
            else 0
          end
        ), 0)`.as("totalYields"),
        totalSold: sql<number>`coalesce(sum(
          case
            when ${operations.type} in ('venda', 'resgate', 'amortizacao') then ${operations.totalAmount}
            else 0
          end
        ), 0)`.as("totalSold"),
      })
      .from(assets)
      .innerJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .leftJoin(operations, eq(operations.assetId, assets.id))
      .where(
        and(
          eq(assets.portfolioId, portfolioId),
          eq(assets.isActive, 1)
        )
      )
      .groupBy(
        assets.id,
        assets.name,
        assets.ticker,
        assets.assetTypeId,
        assetTypes.name,
        assetTypes.category,
        assets.maturityDate
      );

    // Compute per-asset current value (bought + yields - sold)
    const assetsWithValue = assetPositions.map((a) => {
      const bought = Number(a.totalBought);
      const yields = Number(a.totalYields);
      const sold = Number(a.totalSold);
      const currentValue = bought + yields - sold;
      return {
        ...a,
        bought,
        yields,
        sold,
        currentValue,
      };
    });

    // ---------------------------------------------------------------
    // 1. Patrimonio total
    // ---------------------------------------------------------------
    const totalInvested = assetsWithValue.reduce(
      (sum, a) => sum + a.bought,
      0
    );
    const totalEquity = assetsWithValue.reduce(
      (sum, a) => sum + Math.max(a.currentValue, 0),
      0
    );
    const totalProfitLoss = totalEquity - totalInvested;
    const totalProfitLossPct =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    // ---------------------------------------------------------------
    // 2. Patrimonio por classe (donut chart)
    // ---------------------------------------------------------------
    const categoryMap = new Map<
      string,
      { category: string; categoryKey: string; value: number }
    >();

    for (const a of assetsWithValue) {
      const val = Math.max(a.currentValue, 0);
      if (val <= 0) continue;
      const key = a.assetTypeCategory;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.value += val;
      } else {
        categoryMap.set(key, {
          category: CATEGORY_LABELS[key] || key,
          categoryKey: key,
          value: val,
        });
      }
    }

    const equityByCategory = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalEquity > 0 ? (c.value / totalEquity) * 100 : 0,
    }));

    // ---------------------------------------------------------------
    // 3. Top ativos (by value, top 10)
    // ---------------------------------------------------------------
    const topAssets = assetsWithValue
      .filter((a) => a.currentValue > 0)
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 10)
      .map((a) => {
        const profitLoss = a.currentValue - a.bought;
        return {
          id: a.assetId,
          name: a.assetName,
          ticker: a.assetTicker,
          assetTypeName: a.assetTypeName,
          totalValue: a.currentValue,
          profitLoss,
          profitLossPct: a.bought > 0 ? (profitLoss / a.bought) * 100 : 0,
        };
      });

    // ---------------------------------------------------------------
    // 4. Vencimentos proximos (next 90 days)
    // ---------------------------------------------------------------
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);
    const in90DaysStr = in90Days.toISOString().slice(0, 10);

    const upcomingMaturities = assetsWithValue
      .filter(
        (a) =>
          a.maturityDate &&
          a.maturityDate >= todayStr &&
          a.maturityDate <= in90DaysStr &&
          a.currentValue > 0
      )
      .sort((a, b) => (a.maturityDate! > b.maturityDate! ? 1 : -1))
      .map((a) => ({
        id: a.assetId,
        name: a.assetName,
        ticker: a.assetTicker,
        maturityDate: a.maturityDate!,
        totalValue: a.currentValue,
      }));

    // ---------------------------------------------------------------
    // 5. Resumo de projetos
    // ---------------------------------------------------------------
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.portfolioId, portfolioId));

    const activeProjects = allProjects.filter((p) => p.status === "active");
    const totalTargetAmount = activeProjects.reduce(
      (sum, p) => sum + p.targetAmount,
      0
    );
    const totalCurrentAmount = activeProjects.reduce(
      (sum, p) => sum + p.currentAmount,
      0
    );

    const projectsSummary = {
      totalProjects: allProjects.length,
      activeProjects: activeProjects.length,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress:
        totalTargetAmount > 0
          ? (totalCurrentAmount / totalTargetAmount) * 100
          : 0,
      projects: activeProjects.map((p) => ({
        id: p.id,
        name: p.name,
        targetAmount: p.targetAmount,
        currentAmount: p.currentAmount,
        progress:
          p.targetAmount > 0
            ? (p.currentAmount / p.targetAmount) * 100
            : 0,
        targetDate: p.targetDate,
        isRetirement: !!p.isRetirement,
      })),
    };

    // ---------------------------------------------------------------
    // 6. Reserva de emergencia
    // ---------------------------------------------------------------
    const [reserve] = await db
      .select()
      .from(emergencyReserves)
      .where(eq(emergencyReserves.portfolioId, portfolioId))
      .limit(1);

    const emergencyReserve = reserve
      ? {
          targetAmount: reserve.targetAmount,
          currentAmount: reserve.currentAmount,
          progress:
            reserve.targetAmount > 0
              ? (reserve.currentAmount / reserve.targetAmount) * 100
              : 0,
        }
      : null;

    // ---------------------------------------------------------------
    // 7. Alocacao atual vs meta (comparison chart)
    // ---------------------------------------------------------------
    const targets = await db
      .select({
        assetTypeId: allocationTargets.assetTypeId,
        assetTypeName: assetTypes.name,
        targetPercentage: allocationTargets.targetPercentage,
      })
      .from(allocationTargets)
      .innerJoin(
        assetTypes,
        eq(allocationTargets.assetTypeId, assetTypes.id)
      )
      .where(eq(allocationTargets.portfolioId, portfolioId));

    // Build a map of current allocation by assetTypeId
    const currentByType = new Map<string, number>();
    for (const a of assetsWithValue) {
      const val = Math.max(a.currentValue, 0);
      if (val <= 0) continue;
      const cur = currentByType.get(a.assetTypeId) || 0;
      currentByType.set(a.assetTypeId, cur + val);
    }

    const allocationComparison = targets.map((t) => {
      const currentValue = currentByType.get(t.assetTypeId) || 0;
      const currentPct =
        totalEquity > 0 ? (currentValue / totalEquity) * 100 : 0;
      return {
        assetTypeName: t.assetTypeName,
        targetPct: t.targetPercentage,
        currentPct,
        difference: currentPct - t.targetPercentage,
      };
    });

    // ---------------------------------------------------------------
    // 8. Aportes do mes (current month forecasted contributions)
    // ---------------------------------------------------------------
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const sources = await db
      .select()
      .from(contributionSources)
      .where(eq(contributionSources.portfolioId, portfolioId));

    const sourceIds = sources.map((s) => s.id);

    let monthlyContribSources: Array<{ name: string; amount: number }> = [];
    let totalForecasted = 0;

    if (sourceIds.length > 0) {
      for (const source of sources) {
        const [forecast] = await db
          .select()
          .from(contributionForecasts)
          .where(
            and(
              eq(contributionForecasts.sourceId, source.id),
              eq(contributionForecasts.yearMonth, currentYearMonth)
            )
          )
          .limit(1);

        if (forecast && forecast.amount > 0) {
          monthlyContribSources.push({
            name: source.name,
            amount: forecast.amount,
          });
          totalForecasted += forecast.amount;
        }
      }
    }

    const monthlyContributions = {
      totalForecasted,
      sources: monthlyContribSources,
    };

    // ---------------------------------------------------------------
    // 9. Dinheiro nao alocado (assets with category = 'saldo')
    // ---------------------------------------------------------------
    const unallocatedCash = assetsWithValue
      .filter((a) => a.assetTypeCategory === "saldo" && a.currentValue > 0)
      .reduce((sum, a) => sum + a.currentValue, 0);

    // ---------------------------------------------------------------
    // 10. Ultimas operacoes (last 5)
    // ---------------------------------------------------------------
    const recentOps = await db
      .select({
        id: operations.id,
        assetName: assets.name,
        type: operations.type,
        date: operations.date,
        totalAmount: operations.totalAmount,
      })
      .from(operations)
      .innerJoin(assets, eq(operations.assetId, assets.id))
      .where(eq(operations.portfolioId, portfolioId))
      .orderBy(desc(operations.date), desc(operations.createdAt))
      .limit(5);

    const recentOperations = recentOps.map((op) => ({
      id: op.id,
      assetName: op.assetName,
      type: op.type,
      date: op.date,
      totalAmount: op.totalAmount,
    }));

    // ---------------------------------------------------------------
    // Response
    // ---------------------------------------------------------------
    return NextResponse.json({
      totalEquity,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPct,
      equityByCategory,
      topAssets,
      upcomingMaturities,
      projectsSummary,
      emergencyReserve,
      allocationComparison,
      monthlyContributions,
      unallocatedCash,
      recentOperations,
    });
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
