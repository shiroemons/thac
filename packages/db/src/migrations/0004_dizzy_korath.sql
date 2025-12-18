CREATE TABLE `event_days` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_event_days_event_id` ON `event_days` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_days_date` ON `event_days` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_event_days_event_day_number` ON `event_days` (`event_id`,`day_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_event_days_event_date` ON `event_days` (`event_id`,`date`);--> statement-breakpoint
CREATE TABLE `event_series` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_event_series_name` ON `event_series` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_event_series_name_lower` ON `event_series` (lower("name"));--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_series_id` text NOT NULL,
	`name` text NOT NULL,
	`edition` integer,
	`total_days` integer,
	`venue` text,
	`start_date` text,
	`end_date` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`event_series_id`) REFERENCES `event_series`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_events_event_series_id` ON `events` (`event_series_id`);--> statement-breakpoint
CREATE INDEX `idx_events_edition` ON `events` (`edition`);--> statement-breakpoint
CREATE INDEX `idx_events_start_date` ON `events` (`start_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_events_series_edition` ON `events` (`event_series_id`,`edition`);