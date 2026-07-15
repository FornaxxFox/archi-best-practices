CREATE TABLE `workspace_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_label` text DEFAULT '' NOT NULL,
	`schema_version` text NOT NULL,
	`dataset_version` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_spaces_updated_idx` ON `workspace_spaces` (`updated_at`);