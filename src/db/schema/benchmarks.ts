import {
  sqliteTable,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const benchmarks = sqliteTable("benchmark", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("displayName").notNull(),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const benchmarkValues = sqliteTable(
  "benchmark_value",
  {
    id: text("id").primaryKey(),
    benchmarkId: text("benchmarkId")
      .notNull()
      .references(() => benchmarks.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    value: real("value").notNull(),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    uniqueBenchmarkDate: uniqueIndex("benchmark_value_benchmark_date_idx").on(
      table.benchmarkId,
      table.date
    ),
  })
);
