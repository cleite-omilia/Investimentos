import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { families, familyMembers, users } from "@/db/schema";

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
    const { email } = body;

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "E-mail é obrigatório" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Find the current user's family membership
    const [currentMembership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, session.user.id))
      .limit(1);

    if (!currentMembership) {
      return NextResponse.json(
        { error: "Você não pertence a nenhuma família" },
        { status: 400 }
      );
    }

    // Verify the current user is owner of the family
    if (currentMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Apenas o proprietário pode convidar membros" },
        { status: 403 }
      );
    }

    // Find the invited user by email
    const [invitedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado com este e-mail" },
        { status: 404 }
      );
    }

    // Check if the user is already in any family
    const [existingMembership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, invitedUser.id))
      .limit(1);

    if (existingMembership) {
      return NextResponse.json(
        { error: "Este usuário já pertence a uma família" },
        { status: 409 }
      );
    }

    const memberId = crypto.randomUUID();

    // Add as family member
    await db.insert(familyMembers).values({
      id: memberId,
      familyId: currentMembership.familyId,
      userId: invitedUser.id,
      role: "member",
    });

    const member = {
      id: memberId,
      role: "member",
      joinedAt: new Date().toISOString(),
      userId: invitedUser.id,
      userName: invitedUser.name,
      userEmail: invitedUser.email,
      userImage: invitedUser.image,
    };

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Erro ao convidar membro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
