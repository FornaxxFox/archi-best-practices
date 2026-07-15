CREATE TABLE `mcp_rate_limit_buckets` (
	`client_key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`count` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mcp_rate_limit_buckets_window_idx` ON `mcp_rate_limit_buckets` (`window_started_at`);