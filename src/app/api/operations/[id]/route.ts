import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { operations, portfolios, familyMembers } from "@/db/schema";

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

    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    if (!operation) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

    const hasAccess = await verifyPortfolioAccess(
      db,
      operation.portfolioId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    return NextResponse.json({ operation });
  } catch (error) {
    console.error("Erro ao buscar operação:", error);
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

    const [existing] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

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
      .update(operations)
      .set({
        ...(body.type !== undefined && { type: body.type }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice }),
        ...(body.totalAmount !== undefined && { totalAmount: body.totalAmount }),
        ...(body.fees !== undefined && { fees: body.fees }),
        ...(body.brokerFrom !== undefined && {
          brokerFrom: body.brokerFrom || null,
        }),
        ...(body.brokerTo !== undefined && {
          brokerTo: body.brokerTo || null,
        }),
        ...(body.splitFactor !== undefined && {
          splitFactor: body.splitFactor ?? null,
        }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        updatedAt: now,
      })
      .where(eq(operations.id, id));

    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    return NextResponse.json({ operation });
  } catch (error) {
    console.error("Erro ao atualizar operação:", error);
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

    const [existing] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

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

    // Hard delete
    await db.delete(operations).where(eq(operations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir operação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
