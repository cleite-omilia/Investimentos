import { drizzle } from "drizzle-orm/d1";
import bcrypt from "bcryptjs";
import {
  users,
  portfolios,
  userPreferences,
  assetTypes,
  benchmarks,
} from "./schema";

const ASSET_TYPES_DATA = [
  { name: "Ação BR", category: "renda_variavel" },
  { name: "Ação US", category: "renda_variavel" },
  { name: "BDR", category: "renda_variavel" },
  { name: "ETF BR", category: "renda_variavel" },
  { name: "ETF US", category: "renda_variavel" },
  { name: "FII", category: "renda_variavel" },
  { name: "Opção", category: "renda_variavel" },
  { name: "Tesouro Direto", category: "renda_fixa" },
  { name: "CDB", category: "renda_fixa" },
  { name: "LCI", category: "renda_fixa" },
  { name: "LCA", category: "renda_fixa" },
  { name: "CRI", category: "renda_fixa" },
  { name: "CRA", category: "renda_fixa" },
  { name: "Debênture", category: "renda_fixa" },
  { name: "Fundo de Investimento", category: "fundos" },
  { name: "Fundo Multimercado", category: "fundos" },
  { name: "Bitcoin", category: "cripto" },
  { name: "Altcoin", category: "cripto" },
  { name: "Dólar", category: "moeda" },
] as const;

const BENCHMARKS_DATA = [
  { name: "CDI", displayName: "CDI" },
  { name: "IBOV", displayName: "Ibovespa" },
  { name: "IPCA", displayName: "IPCA" },
  { name: "SP500", displayName: "S&P 500" },
  { name: "USD", displayName: "Dólar" },
] as const;

export async function seed(d1: D1Database) {
  const db = drizzle(d1);

  // Create asset types
  for (const assetType of ASSET_TYPES_DATA) {
    await db.insert(assetTypes).values({
      id: crypto.randomUUID(),
      name: assetType.name,
      category: assetType.category,
    });
  }

  // Create initial user
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash("Cabala99@", 10);

  await db.insert(users).values({
    id: userId,
    name: "Cadu Leite",
    email: "caduleitenet@gmail.com",
    passwordHash,
  });

  // Create personal portfolio
  const portfolioId = crypto.randomUUID();
  await db.insert(portfolios).values({
    id: portfolioId,
    name: "Carteira Pessoal",
    type: "personal",
    userId,
  });

  // Create user preferences
  await db.insert(userPreferences).values({
    id: crypto.randomUUID(),
    userId,
    defaultPortfolioId: portfolioId,
  });

  // Create benchmarks
  for (const benchmark of BENCHMARKS_DATA) {
    await db.insert(benchmarks).values({
      id: crypto.randomUUID(),
      name: benchmark.name,
      displayName: benchmark.displayName,
    });
  }

  return { success: true, userId };
}
