CREATE TABLE `source_intake_review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`actor` text DEFAULT 'api' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_intake_review_events_record_idx` ON `source_intake_review_events` (`record_id`);--> statement-breakpoint
CREATE INDEX `source_intake_review_events_created_idx` ON `source_intake_review_events` (`created_at`);