import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";
import { assets } from "./assets";

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshot",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolioId")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    totalEquity: integer("totalEquity").notNull(), // centavos
    totalInvested: integer("totalInvested").notNull(), // centavos
    profitLoss: integer("profitLoss").notNull(), // centavos
    profitLossPct: real("profitLossPct").notNull(),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniquePortfolioDate: uniqueIndex("portfolio_snapshot_portfolio_date_idx").on(
      table.portfolioId,
      table.date
    ),
  })
);

export const assetSnapshots = sqliteTable(
  "asset_snapshot",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolioId")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    assetId: text("assetId")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    quantity: real("quantity").notNull(),
    averagePrice: integer("averagePrice").notNull(), // centavos
    currentPrice: integer("currentPrice").notNull(), // centavos
    totalValue: integer("totalValue").notNull(), // centavos
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniquePortfolioAssetDate: uniqueIndex(
      "asset_snapshot_portfolio_asset_date_idx"
    ).on(table.portfolioId, table.assetId, table.date),
  })
);
