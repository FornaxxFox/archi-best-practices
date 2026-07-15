CREATE TABLE `workspace_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`member_id` text,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_audit_events_space_idx` ON `workspace_audit_events` (`space_id`);--> statement-breakpoint
CREATE INDEX `workspace_audit_events_created_idx` ON `workspace_audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`member_id` text NOT NULL,
	`label` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `workspace_members_space_idx` ON `workspace_members` (`space_id`);--> statement-breakpoint
CREATE INDEX `workspace_members_token_idx` ON `workspace_members` (`token_hash`);