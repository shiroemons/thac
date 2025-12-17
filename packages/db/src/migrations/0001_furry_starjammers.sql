CREATE TABLE `alias_types` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `credit_roles` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `official_work_categories` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `platforms` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`url_pattern` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_platforms_category` ON `platforms` (`category`);--> statement-breakpoint
CREATE TABLE `official_songs` (
	`id` text PRIMARY KEY NOT NULL,
	`official_work_id` text,
	`name` text NOT NULL,
	`name_ja` text NOT NULL,
	`name_en` text,
	`theme_type` text,
	`composer_name` text,
	`is_official_arrangement` integer DEFAULT false NOT NULL,
	`source_song_id` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`official_work_id`) REFERENCES `official_works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_official_songs_work` ON `official_songs` (`official_work_id`);--> statement-breakpoint
CREATE INDEX `idx_official_songs_theme` ON `official_songs` (`theme_type`);--> statement-breakpoint
CREATE INDEX `idx_official_songs_source` ON `official_songs` (`source_song_id`);--> statement-breakpoint
CREATE TABLE `official_works` (
	`id` text PRIMARY KEY NOT NULL,
	`category_code` text NOT NULL,
	`name` text NOT NULL,
	`name_ja` text NOT NULL,
	`name_en` text,
	`short_name_ja` text,
	`short_name_en` text,
	`series_code` text,
	`number_in_series` real,
	`release_date` text,
	`official_organization` text,
	`position` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_code`) REFERENCES `official_work_categories`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_official_works_category` ON `official_works` (`category_code`);--> statement-breakpoint
CREATE INDEX `idx_official_works_release_date` ON `official_works` (`release_date`);--> statement-breakpoint
CREATE INDEX `idx_official_works_position` ON `official_works` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_official_works_series_code` ON `official_works` (`series_code`);