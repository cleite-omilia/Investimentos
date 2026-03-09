import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";
import { assets } from "./assets";

export const operations = sqliteTable("operation", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  assetId: text("assetId")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'compra' | 'venda' | 'dividendo' | 'jcp' | 'rendimento' | 'desdobramento' | 'grupamento' | 'bonificacao' | 'transferencia' | 'amortizacao'
  date: text("date").notNull(),
  quantity: real("quantity").notNull().default(0),
  unitPrice: integer("unitPrice").notNull().default(0), // centavos
  totalAmount: integer("totalAmount").notNull().default(0), // centavos
  fees: integer("fees").notNull().default(0), // centavos
  brokerFrom: text("brokerFrom"),
  brokerTo: text("brokerTo"),
  splitFactor: real("splitFactor"),
  notes: text("notes"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
