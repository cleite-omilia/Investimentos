import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users, userPreferences } from "@/db/schema";

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

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const [preferences] = await db
      .select({
        theme: userPreferences.theme,
        defaultPortfolioId: userPreferences.defaultPortfolioId,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      preferences: preferences || {
        theme: "system",
        defaultPortfolioId: null,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as any;
    const { name, theme, defaultPortfolioId } = body;

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Update user name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Nome é obrigatório" },
          { status: 400 }
        );
      }

      await db
        .update(users)
        .set({
          name: name.trim(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, session.user.id));
    }

    // Update preferences if theme or defaultPortfolioId provided
    const hasPreferenceUpdate =
      theme !== undefined || defaultPortfolioId !== undefined;

    if (hasPreferenceUpdate) {
      if (theme !== undefined && !["light", "dark", "system"].includes(theme)) {
        return NextResponse.json(
          { error: "Tema inválido" },
          { status: 400 }
        );
      }

      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, session.user.id))
        .limit(1);

      const prefsUpdate: Record<string, string | null> = {
        updatedAt: new Date().toISOString(),
      };

      if (theme !== undefined) {
        prefsUpdate.theme = theme;
      }

      if (defaultPortfolioId !== undefined) {
        prefsUpdate.defaultPortfolioId = defaultPortfolioId || null;
      }

      if (existing) {
        await db
          .update(userPreferences)
          .set(prefsUpdate)
          .where(eq(userPreferences.userId, session.user.id));
      } else {
        await db.insert(userPreferences).values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          theme: theme || "system",
          defaultPortfolioId: defaultPortfolioId || null,
        });
      }
    }

    // Return updated data
    const [updatedUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const [updatedPreferences] = await db
      .select({
        theme: userPreferences.theme,
        defaultPortfolioId: userPreferences.defaultPortfolioId,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
      },
      preferences: updatedPreferences || {
        theme: "system",
        defaultPortfolioId: null,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil do usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
