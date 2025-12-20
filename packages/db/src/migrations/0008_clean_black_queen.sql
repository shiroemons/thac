DROP INDEX `uq_track_credits_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_credits_no_alias` ON `track_credits` (`track_id`,`artist_id`) WHERE "track_credits"."artist_alias_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_track_credits_with_alias` ON `track_credits` (`track_id`,`artist_id`,`artist_alias_id`) WHERE "track_credits"."artist_alias_id" IS NOT NULL;