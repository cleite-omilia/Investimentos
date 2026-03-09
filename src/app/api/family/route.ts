import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { families, familyMembers, portfolios, users } from "@/db/schema";

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

    // Find the user's family membership
    const userMemberships = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, session.user.id))
      .limit(1);

    if (userMemberships.length === 0) {
      return NextResponse.json({ family: null, members: [] });
    }

    const membership = userMemberships[0];

    // Get the family
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, membership.familyId))
      .limit(1);

    if (!family) {
      return NextResponse.json({ family: null, members: [] });
    }

    // Get all members with user info
    const membersWithUsers = await db
      .select({
        id: familyMembers.id,
        role: familyMembers.role,
        joinedAt: familyMembers.joinedAt,
        userId: familyMembers.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, family.id));

    return NextResponse.json({ family, members: membersWithUsers });
  } catch (error) {
    console.error("Erro ao buscar família:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome da família é obrigatório" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Check if user already belongs to a family
    const existingMembership = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, session.user.id))
      .limit(1);

    if (existingMembership.length > 0) {
      return NextResponse.json(
        { error: "Você já pertence a uma família" },
        { status: 409 }
      );
    }

    const familyId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const portfolioId = crypto.randomUUID();

    // Create the family
    await db.insert(families).values({
      id: familyId,
      name: name.trim(),
      createdById: session.user.id,
    });

    // Add the creator as owner
    await db.insert(familyMembers).values({
      id: memberId,
      familyId,
      userId: session.user.id,
      role: "owner",
    });

    // Create the family portfolio
    await db.insert(portfolios).values({
      id: portfolioId,
      name: `Carteira Familiar - ${name.trim()}`,
      type: "family",
      familyId,
    });

    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, familyId))
      .limit(1);

    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.id, portfolioId))
      .limit(1);

    return NextResponse.json({ family, portfolio }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar família:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
