import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { seed } from "@/db/seed";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seed não permitido em produção" },
        { status: 403 }
      );
    }

    const { env } = await getCloudflareContext();
    const result = await seed(env.DB);

    return NextResponse.json(
      { message: "Seed executado com sucesso", ...result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao executar seed:", error);
    return NextResponse.json(
      { error: "Erro ao executar seed", details: String(error) },
      { status: 500 }
    );
  }
}
