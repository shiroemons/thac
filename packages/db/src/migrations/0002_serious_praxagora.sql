CREATE INDEX "idx_artist_aliases_name_lower" ON "artist_aliases" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_artists_name_lower" ON "artists" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_circles_name_lower" ON "circles" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_event_series_name_lower" ON "event_series" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_releases_updated_at" ON "releases" USING btree ("updated_at");