CREATE TABLE `source_intake_records` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`case_title` text NOT NULL,
	`status` text NOT NULL,
	`source_count` integer NOT NULL,
	`reachable_count` integer NOT NULL,
	`failed_count` integer NOT NULL,
	`generated_at` text NOT NULL,
	`report_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_intake_records_case_idx` ON `source_intake_records` (`case_id`);--> statement-breakpoint
CREATE INDEX `source_intake_records_status_idx` ON `source_intake_records` (`status`);--> statement-breakpoint
CREATE INDEX `source_intake_records_created_idx` ON `source_intake_records` (`created_at`);