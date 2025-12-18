DROP INDEX `uq_artist_aliases_artist_name`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_artist_aliases_name` ON `artist_aliases` (`artist_id`,`name`);