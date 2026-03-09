import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";

export const emergencyReserves = sqliteTable("emergency_reserve", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolioId")
    .notNull()
    .unique()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  targetAmount: integer("targetAmount").notNull(), // centavos
  currentAmount: integer("currentAmount").notNull().default(0), // centavos
  notes: text("notes"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
