CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_artist_aliases_name_trgm" ON "artist_aliases" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_artists_name_trgm" ON "artists" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_circles_name_trgm" ON "circles" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_circles_name_ja_trgm" ON "circles" USING gin ("name_ja" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_circles_name_en_trgm" ON "circles" USING gin ("name_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_official_songs_work_original" ON "official_songs" USING btree ("official_work_id","is_original");