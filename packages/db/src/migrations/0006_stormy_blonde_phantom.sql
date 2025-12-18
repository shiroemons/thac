DROP INDEX `idx_artists_name`;--> statement-breakpoint
DROP INDEX `idx_artists_initial_script`;--> statement-breakpoint
DROP INDEX `uq_artists_name_lower`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_artists_name` ON `artists` (`name`);--> statement-breakpoint
CREATE INDEX `idx_artists_sort` ON `artists` (`sort_name`);--> statement-breakpoint
CREATE INDEX `idx_artists_initial` ON `artists` (`name_initial`,`initial_script`);--> statement-breakpoint
DROP INDEX `idx_circles_name`;--> statement-breakpoint
DROP INDEX `idx_circles_initial_script`;--> statement-breakpoint
DROP INDEX `uq_circles_name_lower`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_circles_name` ON `circles` (`name`);--> statement-breakpoint
CREATE INDEX `idx_circles_initial` ON `circles` (`name_initial`,`initial_script`);--> statement-breakpoint
DROP INDEX `uq_event_series_name_lower`;--> statement-breakpoint
ALTER TABLE `event_series` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_event_series_sort_order` ON `event_series` (`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_event_series_name` ON `event_series` (`name`);