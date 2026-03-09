import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { portfolios, familyMembers } from "@/db/schema";

export async function GET() {
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

    // Get the user's personal portfolio
    const personalPortfolios = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.type, "personal"),
          eq(portfolios.userId, session.user.id)
        )
      );

    // Check if user belongs to a family
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, session.user.id))
      .limit(1);

    let familyPortfolios: typeof personalPortfolios = [];

    if (membership) {
      familyPortfolios = await db
        .select()
        .from(portfolios)
        .where(
          and(
            eq(portfolios.type, "family"),
            eq(portfolios.familyId, membership.familyId)
          )
        );
    }

    const allPortfolios = [...personalPortfolios, ...familyPortfolios];

    return NextResponse.json({ portfolios: allPortfolios });
  } catch (error) {
    console.error("Erro ao buscar carteiras:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
