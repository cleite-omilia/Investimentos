import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  allocationTargets,
  assetTypes,
  assets,
  operations,
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

    // Fetch allocation targets joined with asset types
    const targets = await db
      .select({
        id: allocationTargets.id,
        assetTypeId: allocationTargets.assetTypeId,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
        targetPercentage: allocationTargets.targetPercentage,
      })
      .from(allocationTargets)
      .innerJoin(
        assetTypes,
        eq(allocationTargets.assetTypeId, assetTypes.id)
      )
      .where(eq(allocationTargets.portfolioId, portfolioId));

    // Calculate current allocation per asset type
    // 1. Get all assets in the portfolio grouped by assetTypeId
    // 2. For each asset, sum operations (compra adds, venda subtracts)
    const currentAllocationRows = await db
      .select({
        assetTypeId: assets.assetTypeId,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
        currentValue: sql<number>`
          coalesce(sum(
            case
              when ${operations.type} = 'compra' then ${operations.totalAmount}
              when ${operations.type} = 'venda' then -${operations.totalAmount}
              else 0
            end
          ), 0)
        `.as("currentValue"),
      })
      .from(assets)
      .innerJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .leftJoin(operations, eq(operations.assetId, assets.id))
      .where(eq(assets.portfolioId, portfolioId))
      .groupBy(assets.assetTypeId, assetTypes.name, assetTypes.category);

    // Calculate total portfolio value
    const totalPortfolioValue = currentAllocationRows.reduce(
      (sum, row) => sum + Math.max(Number(row.currentValue), 0),
      0
    );

    // Build current allocations with percentages
    const currentAllocations = currentAllocationRows
      .filter((row) => Number(row.currentValue) > 0)
      .map((row) => {
        const value = Number(row.currentValue);
        return {
          assetTypeId: row.assetTypeId,
          assetTypeName: row.assetTypeName,
          assetTypeCategory: row.assetTypeCategory,
          currentValue: value,
          currentPercentage:
            totalPortfolioValue > 0
              ? (value / totalPortfolioValue) * 100
              : 0,
        };
      });

    return NextResponse.json({
      targets,
      currentAllocations,
      totalPortfolioValue,
    });
  } catch (error) {
    console.error("Erro ao buscar metas de alocacao:", error);
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
        { error: "Nao autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    const { portfolioId, targets: targetList } = body;

    if (!portfolioId || !Array.isArray(targetList)) {
      return NextResponse.json(
        { error: "portfolioId e targets sao obrigatorios" },
        { status: 400 }
      );
    }

    // Validate that total percentage sums to 100 (with tolerance)
    const totalPercentage = targetList.reduce(
      (sum: number, t: any) => sum + (Number(t.targetPercentage) || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.1) {
      return NextResponse.json(
        {
          error: `A soma das porcentagens deve ser 100%. Atual: ${totalPercentage.toFixed(1)}%`,
        },
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

    const now = new Date().toISOString();

    // Get existing targets for this portfolio
    const existingTargets = await db
      .select()
      .from(allocationTargets)
      .where(eq(allocationTargets.portfolioId, portfolioId));

    const existingMap = new Map(
      existingTargets.map((t) => [t.assetTypeId, t])
    );

    const newAssetTypeIds = new Set(
      targetList.map((t: any) => t.assetTypeId as string)
    );

    // Delete targets that are no longer in the list
    for (const existing of existingTargets) {
      if (!newAssetTypeIds.has(existing.assetTypeId)) {
        await db
          .delete(allocationTargets)
          .where(eq(allocationTargets.id, existing.id));
      }
    }

    // Upsert each target
    for (const target of targetList) {
      const assetTypeId = target.assetTypeId as string;
      const targetPercentage = Number(target.targetPercentage);

      const existing = existingMap.get(assetTypeId);

      if (existing) {
        // Update
        await db
          .update(allocationTargets)
          .set({
            targetPercentage,
            updatedAt: now,
          })
          .where(eq(allocationTargets.id, existing.id));
      } else {
        // Create
        const id = crypto.randomUUID();
        await db.insert(allocationTargets).values({
          id,
          portfolioId,
          assetTypeId,
          targetPercentage,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Return updated targets
    const updatedTargets = await db
      .select({
        id: allocationTargets.id,
        assetTypeId: allocationTargets.assetTypeId,
        assetTypeName: assetTypes.name,
        assetTypeCategory: assetTypes.category,
        targetPercentage: allocationTargets.targetPercentage,
      })
      .from(allocationTargets)
      .innerJoin(
        assetTypes,
        eq(allocationTargets.assetTypeId, assetTypes.id)
      )
      .where(eq(allocationTargets.portfolioId, portfolioId));

    return NextResponse.json({ targets: updatedTargets }, { status: 200 });
  } catch (error) {
    console.error("Erro ao salvar metas de alocacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
