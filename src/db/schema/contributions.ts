import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";

export const contributionSources = sqliteTable("contribution_source", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const contributionForecasts = sqliteTable(
  "contribution_forecast",
  {
    id: text("id").primaryKey(),
    sourceId: text("sourceId")
      .notNull()
      .references(() => contributionSources.id, { onDelete: "cascade" }),
    yearMonth: text("yearMonth").notNull(), // '2026-03'
    amount: integer("amount").notNull(), // centavos
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniqueSourceYearMonth: uniqueIndex(
      "contribution_forecast_source_yearmonth_idx"
    ).on(table.sourceId, table.yearMonth),
  })
);
