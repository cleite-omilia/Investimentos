import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { assetTypes } from "@/db/schema";

export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const types = await db.select().from(assetTypes);

    return NextResponse.json({ assetTypes: types });
  } catch (error) {
    console.error("Erro ao buscar tipos de ativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
