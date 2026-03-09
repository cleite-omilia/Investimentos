import {
  sqliteTable,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";
import { assetTypes } from "./assets";

export const allocationTargets = sqliteTable(
  "allocation_target",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolioId")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    assetTypeId: text("assetTypeId")
      .notNull()
      .references(() => assetTypes.id, { onDelete: "cascade" }),
    targetPercentage: real("targetPercentage").notNull(),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniquePortfolioAssetType: uniqueIndex(
      "allocation_target_portfolio_assettype_idx"
    ).on(table.portfolioId, table.assetTypeId),
  })
);
