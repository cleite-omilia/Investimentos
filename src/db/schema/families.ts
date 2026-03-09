import {
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const families = sqliteTable("family", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdById: text("createdById")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const familyMembers = sqliteTable(
  "family_member",
  {
    id: text("id").primaryKey(),
    familyId: text("familyId")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'admin' | 'member'
    joinedAt: text("joinedAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniqueFamilyUser: uniqueIndex("family_member_family_user_idx").on(
      table.familyId,
      table.userId
    ),
  })
);
