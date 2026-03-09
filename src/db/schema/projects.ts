import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { portfolios } from "./portfolios";

export const projects = sqliteTable("project", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: integer("targetAmount").notNull(), // centavos
  targetDate: text("targetDate"),
  recurrence: text("recurrence").notNull().default("once"), // 'once' | 'monthly' | 'yearly'
  recurrenceMonth: integer("recurrenceMonth"),
  isRetirement: integer("isRetirement").notNull().default(0),
  retirementMonthlyWithdrawal: integer("retirementMonthlyWithdrawal"), // centavos
  ipcaRate: real("ipcaRate"),
  priority: integer("priority").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'cancelled'
  currentAmount: integer("currentAmount").notNull().default(0), // centavos
  notes: text("notes"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updatedAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const projectProvisions = sqliteTable("project_provision", {
  id: text("id").primaryKey(),
  projectId: text("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  amount: integer("amount").notNull(), // centavos
  source: text("source").notNull().default("manual"), // 'manual' | 'automatic'
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});
