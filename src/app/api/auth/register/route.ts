import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "@/db/schema";
import { portfolios } from "@/db/schema";
import { userPreferences } from "@/db/schema";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const { env } = await getCloudflareContext();
    const db = drizzle(env.DB);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const portfolioId = crypto.randomUUID();
    const preferencesId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
    });

    await db.insert(portfolios).values({
      id: portfolioId,
      name: "Carteira Pessoal",
      type: "personal",
      userId,
    });

    await db.insert(userPreferences).values({
      id: preferencesId,
      userId,
      defaultPortfolioId: portfolioId,
    });

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
