import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceIntakeRecords = sqliteTable(
  "source_intake_records",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull(),
    caseTitle: text("case_title").notNull(),
    status: text("status", { enum: ["recorded", "needs_review"] }).notNull(),
    sourceCount: integer("source_count").notNull(),
    reachableCount: integer("reachable_count").notNull(),
    failedCount: integer("failed_count").notNull(),
    generatedAt: text("generated_at").notNull(),
    reportJson: text("report_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("source_intake_records_case_idx").on(table.caseId),
    index("source_intake_records_status_idx").on(table.status),
    index("source_intake_records_created_idx").on(table.createdAt),
  ],
);
