CREATE TABLE `artist_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`name` text NOT NULL,
	`alias_type_code` text,
	`name_initial` text,
	`initial_script` text NOT NULL,
	`period_from` text,
	`period_to` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alias_type_code`) REFERENCES `alias_types`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_artist_aliases_artist_id` ON `artist_aliases` (`artist_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_artist_aliases_artist_name` ON `artist_aliases` (`artist_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_ja` text,
	`name_en` text,
	`sort_name` text,
	`name_initial` text,
	`initial_script` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_artists_name` ON `artists` (`name`);--> statement-breakpoint
CREATE INDEX `idx_artists_initial_script` ON `artists` (`initial_script`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_artists_name_lower` ON `artists` (lower("name"));--> statement-breakpoint
CREATE TABLE `circle_links` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`platform_code` text NOT NULL,
	`url` text NOT NULL,
	`platform_id` text,
	`handle` text,
	`is_official` integer DEFAULT true NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_code`) REFERENCES `platforms`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_circle_links_circle_id` ON `circle_links` (`circle_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_circle_links_circle_url` ON `circle_links` (`circle_id`,`url`);--> statement-breakpoint
CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_ja` text,
	`name_en` text,
	`name_initial` text,
	`initial_script` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_circles_name` ON `circles` (`name`);--> statement-breakpoint
CREATE INDEX `idx_circles_initial_script` ON `circles` (`initial_script`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_circles_name_lower` ON `circles` (lower("name"));