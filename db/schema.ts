import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceIntakeRecords = sqliteTable(
  "source_intake_records",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull(),
    caseTitle: text("case_title").notNull(),
    status: text("status", { enum: ["recorded", "needs_review", "approved", "rejected"] }).notNull(),
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

export const mcpRateLimitBuckets = sqliteTable(
  "mcp_rate_limit_buckets",
  {
    clientKey: text("client_key").primaryKey(),
    windowStartedAt: integer("window_started_at").notNull(),
    count: integer("count").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("mcp_rate_limit_buckets_window_idx").on(table.windowStartedAt)],
);

export const sourceIntakeReviewEvents = sqliteTable(
  "source_intake_review_events",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status", { enum: ["recorded", "needs_review", "approved", "rejected"] }).notNull(),
    note: text("note").notNull().default(""),
    actor: text("actor").notNull().default("api"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("source_intake_review_events_record_idx").on(table.recordId),
    index("source_intake_review_events_created_idx").on(table.createdAt),
  ],
);

export const workspaceSpaces = sqliteTable(
  "workspace_spaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerLabel: text("owner_label").notNull().default(""),
    schemaVersion: text("schema_version").notNull(),
    datasetVersion: text("dataset_version").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("workspace_spaces_updated_idx").on(table.updatedAt)],
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    memberId: text("member_id").notNull(),
    label: text("label").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("workspace_members_space_idx").on(table.spaceId),
    index("workspace_members_token_idx").on(table.tokenHash),
  ],
);

export const workspaceAuditEvents = sqliteTable(
  "workspace_audit_events",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    memberId: text("member_id"),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    detailJson: text("detail_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("workspace_audit_events_space_idx").on(table.spaceId),
    index("workspace_audit_events_created_idx").on(table.createdAt),
  ],
);
