import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";
import { portfolios } from "./portfolios";

export const userPreferences = sqliteTable("user_preference", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"), // 'light' | 'dark' | 'system'
  defaultPortfolioId: text("defaultPortfolioId").references(
    () => portfolios.id,
    { onDelete: "set null" }
  ),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
