import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";

export const assetTypes = sqliteTable("asset_type", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // 'renda_variavel' | 'renda_fixa' | 'fundos' | 'cripto' | 'moeda' | 'saldo'
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const assets = sqliteTable("asset", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  assetTypeId: text("assetTypeId")
    .notNull()
    .references(() => assetTypes.id, { onDelete: "restrict" }),
  ticker: text("ticker"),
  name: text("name").notNull(),
  broker: text("broker"),
  currency: text("currency").notNull().default("BRL"),
  maturityDate: text("maturityDate"),
  indexer: text("indexer"),
  indexerRate: real("indexerRate"),
  isActive: integer("isActive").notNull().default(1),
  stopGainPrice: real("stopGainPrice"),
  stopLossPrice: real("stopLossPrice"),
  currentValue: integer("currentValue"), // centavos, valor atual de mercado
  currentValueUpdatedAt: text("currentValueUpdatedAt"), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
