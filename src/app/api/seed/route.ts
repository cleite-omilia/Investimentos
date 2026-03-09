import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { seed } from "@/db/seed";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (key !== "investimentos-seed-2025") {
      return NextResponse.json(
        { error: "Não autorizado" },
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
