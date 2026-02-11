CREATE INDEX "idx_tags_attributes_gin" ON "tags" USING gin ("attributes");--> statement-breakpoint
CREATE INDEX "idx_track_credits_artist_track" ON "track_credits" USING btree ("artist_id","track_id");--> statement-breakpoint
ALTER TABLE "track_genres" ADD CONSTRAINT "check_track_genres_position" CHECK ("position" >= 1 AND "position" <= 5);--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "check_release_year" CHECK ("release_year" >= 1900 AND "release_year" <= 2200);--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "check_release_month" CHECK ("release_month" >= 1 AND "release_month" <= 12);--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "check_release_day" CHECK ("release_day" >= 1 AND "release_day" <= 31);--> statement-breakpoint
ALTER TABLE "track_tags" ADD CONSTRAINT "check_track_tags_position" CHECK ("position" >= 1 AND "position" <= 15);