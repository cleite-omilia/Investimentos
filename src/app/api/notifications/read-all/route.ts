import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Contar não lidas antes de atualizar
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, 0)
        )
      );

    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, 0)
        )
      );

    return NextResponse.json({
      success: true,
      count: countResult?.count ?? 0,
    });
  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
