CREATE TABLE `release_jan_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`jan_code` text NOT NULL,
	`label` text,
	`country_code` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_release_jan_codes_release` ON `release_jan_codes` (`release_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_release_jan_codes_jan` ON `release_jan_codes` (`jan_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_release_jan_codes_primary` ON `release_jan_codes` (`release_id`) WHERE "release_jan_codes"."is_primary" = 1;--> statement-breakpoint
CREATE TABLE `track_isrcs` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`isrc` text NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_track_isrcs_track` ON `track_isrcs` (`track_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_isrcs` ON `track_isrcs` (`track_id`,`isrc`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_isrcs_primary` ON `track_isrcs` (`track_id`) WHERE "track_isrcs"."is_primary" = 1;--> statement-breakpoint
CREATE TABLE `official_song_links` (
	`id` text PRIMARY KEY NOT NULL,
	`official_song_id` text NOT NULL,
	`platform_code` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`official_song_id`) REFERENCES `official_songs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_code`) REFERENCES `platforms`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_official_song_links_song_id` ON `official_song_links` (`official_song_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_official_song_links_song_url` ON `official_song_links` (`official_song_id`,`url`);--> statement-breakpoint
CREATE TABLE `official_work_links` (
	`id` text PRIMARY KEY NOT NULL,
	`official_work_id` text NOT NULL,
	`platform_code` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`official_work_id`) REFERENCES `official_works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_code`) REFERENCES `platforms`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_official_work_links_work_id` ON `official_work_links` (`official_work_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_official_work_links_work_url` ON `official_work_links` (`official_work_id`,`url`);--> statement-breakpoint
CREATE TABLE `release_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`platform_code` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_code`) REFERENCES `platforms`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_release_publications_release` ON `release_publications` (`release_id`);--> statement-breakpoint
CREATE INDEX `idx_release_publications_platform` ON `release_publications` (`platform_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_release_publications_url` ON `release_publications` (`release_id`,`url`);--> statement-breakpoint
CREATE TABLE `track_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`platform_code` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_code`) REFERENCES `platforms`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_track_publications_track` ON `track_publications` (`track_id`);--> statement-breakpoint
CREATE INDEX `idx_track_publications_platform` ON `track_publications` (`platform_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_publications_url` ON `track_publications` (`track_id`,`url`);--> statement-breakpoint
CREATE TABLE `track_derivations` (
	`id` text PRIMARY KEY NOT NULL,
	`child_track_id` text NOT NULL,
	`parent_track_id` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`child_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_track_derivations_child` ON `track_derivations` (`child_track_id`);--> statement-breakpoint
CREATE INDEX `idx_track_derivations_parent` ON `track_derivations` (`parent_track_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_derivations` ON `track_derivations` (`child_track_id`,`parent_track_id`);--> statement-breakpoint
CREATE TABLE `track_official_songs` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`official_song_id` text,
	`custom_song_name` text,
	`part_position` integer,
	`start_second` real,
	`end_second` real,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`official_song_id`) REFERENCES `official_songs`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_track_official_songs_track` ON `track_official_songs` (`track_id`);--> statement-breakpoint
CREATE INDEX `idx_track_official_songs_song` ON `track_official_songs` (`official_song_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_official_songs` ON `track_official_songs` (`track_id`,`official_song_id`,`part_position`);--> statement-breakpoint
DROP INDEX `idx_official_songs_theme`;--> statement-breakpoint
ALTER TABLE `official_songs` ADD `track_number` integer;--> statement-breakpoint
ALTER TABLE `official_songs` ADD `arranger_name` text;--> statement-breakpoint
ALTER TABLE `official_songs` ADD `is_original` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `official_songs` DROP COLUMN `theme_type`;--> statement-breakpoint
ALTER TABLE `official_songs` DROP COLUMN `is_official_arrangement`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_series_id` text,
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
INSERT INTO `__new_events`("id", "event_series_id", "name", "edition", "total_days", "venue", "start_date", "end_date", "created_at", "updated_at") SELECT "id", "event_series_id", "name", "edition", "total_days", "venue", "start_date", "end_date", "created_at", "updated_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_events_event_series_id` ON `events` (`event_series_id`);--> statement-breakpoint
CREATE INDEX `idx_events_edition` ON `events` (`edition`);--> statement-breakpoint
CREATE INDEX `idx_events_start_date` ON `events` (`start_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_events_series_edition` ON `events` (`event_series_id`,`edition`);--> statement-breakpoint
ALTER TABLE `alias_types` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_alias_types_sort_order` ON `alias_types` (`sort_order`);--> statement-breakpoint
ALTER TABLE `credit_roles` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_credit_roles_sort_order` ON `credit_roles` (`sort_order`);--> statement-breakpoint
ALTER TABLE `official_work_categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_official_work_categories_sort_order` ON `official_work_categories` (`sort_order`);--> statement-breakpoint
ALTER TABLE `platforms` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_platforms_sort_order` ON `platforms` (`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_track_credit_roles_composite` ON `track_credit_roles` (`track_credit_id`,`role_code`);--> statement-breakpoint
CREATE INDEX `idx_tracks_ordering` ON `tracks` (`release_id`,`disc_id`,`track_number`);--> statement-breakpoint
CREATE INDEX `idx_release_circles_release` ON `release_circles` (`release_id`);