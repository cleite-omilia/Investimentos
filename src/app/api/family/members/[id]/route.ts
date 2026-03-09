import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { familyMembers } from "@/db/schema";

export async function DELETE(
  request: Request,
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

    const { id: memberId } = await params;

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

    // Find the member to be removed
    const [targetMember] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId))
      .limit(1);

    if (!targetMember) {
      return NextResponse.json(
        { error: "Membro não encontrado" },
        { status: 404 }
      );
    }

    // Verify both are in the same family
    if (targetMember.familyId !== currentMembership.familyId) {
      return NextResponse.json(
        { error: "Membro não pertence à sua família" },
        { status: 403 }
      );
    }

    // Cannot remove the owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Não é possível remover o proprietário da família" },
        { status: 403 }
      );
    }

    // Only owner can remove members
    if (currentMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Apenas o proprietário pode remover membros" },
        { status: 403 }
      );
    }

    // Delete the family member record
    await db
      .delete(familyMembers)
      .where(eq(familyMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
