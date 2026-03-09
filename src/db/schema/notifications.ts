import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";
import { portfolios } from "./portfolios";

export const notifications = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  portfolioId: text("portfolioId").references(() => portfolios.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // 'stop_gain' | 'stop_loss' | 'maturity' | 'contribution' | 'project' | 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("isRead").notNull().default(0),
  link: text("link"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
