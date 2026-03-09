import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";
import { families } from "./families";

export const portfolios = sqliteTable("portfolio", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'personal' | 'family'
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  familyId: text("familyId").references(() => families.id, {
    onDelete: "set null",
  }),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
