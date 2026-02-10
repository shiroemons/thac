CREATE TABLE "artist_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"name" text NOT NULL,
	"alias_type_code" text,
	"name_initial" text,
	"initial_script" text NOT NULL,
	"period_from" date,
	"period_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ja" text,
	"name_en" text,
	"sort_name" text,
	"name_initial" text,
	"initial_script" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_links" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"platform_code" text NOT NULL,
	"url" text NOT NULL,
	"platform_id" text,
	"handle" text,
	"is_official" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ja" text,
	"name_en" text,
	"sort_name" text,
	"name_initial" text,
	"initial_script" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_days" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_series" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_series_id" text,
	"name" text NOT NULL,
	"edition" integer,
	"total_days" integer,
	"venue" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"code" text PRIMARY KEY NOT NULL,
	"name_ja" text NOT NULL,
	"name_en" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_genres" (
	"track_id" text NOT NULL,
	"genre_code" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "track_genres_track_id_genre_code_pk" PRIMARY KEY("track_id","genre_code")
);
--> statement-breakpoint
CREATE TABLE "release_jan_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"jan_code" text NOT NULL,
	"label" text,
	"country_code" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_isrcs" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"isrc" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alias_types" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_roles" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_work_categories" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"url_pattern" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_song_links" (
	"id" text PRIMARY KEY NOT NULL,
	"official_song_id" text NOT NULL,
	"platform_code" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_songs" (
	"id" text PRIMARY KEY NOT NULL,
	"official_work_id" text,
	"track_number" integer,
	"name" text NOT NULL,
	"name_ja" text NOT NULL,
	"name_en" text,
	"composer_name" text,
	"arranger_name" text,
	"is_original" boolean DEFAULT true NOT NULL,
	"source_song_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_work_links" (
	"id" text PRIMARY KEY NOT NULL,
	"official_work_id" text NOT NULL,
	"platform_code" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_works" (
	"id" text PRIMARY KEY NOT NULL,
	"category_code" text NOT NULL,
	"name" text NOT NULL,
	"name_ja" text NOT NULL,
	"name_en" text,
	"short_name_ja" text,
	"short_name_en" text,
	"number_in_series" real,
	"release_date" date,
	"official_organization" text,
	"position" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"platform_code" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"platform_code" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discs" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"disc_number" integer NOT NULL,
	"disc_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_circles" (
	"release_id" text NOT NULL,
	"circle_id" text NOT NULL,
	"participation_type" text NOT NULL,
	"position" integer DEFAULT 1,
	CONSTRAINT "release_circles_release_id_circle_id_participation_type_pk" PRIMARY KEY("release_id","circle_id","participation_type")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ja" text,
	"name_en" text,
	"release_date" date,
	"release_year" integer,
	"release_month" integer,
	"release_day" integer,
	"release_type" text,
	"event_id" text,
	"event_day_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "track_tags" (
	"track_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"position" integer NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "track_tags_track_id_tag_id_pk" PRIMARY KEY("track_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "track_credit_roles" (
	"track_credit_id" text NOT NULL,
	"role_code" text NOT NULL,
	"role_position" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "track_credit_roles_track_credit_id_role_code_role_position_pk" PRIMARY KEY("track_credit_id","role_code","role_position")
);
--> statement-breakpoint
CREATE TABLE "track_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"credit_name" text NOT NULL,
	"alias_type_code" text,
	"credit_position" integer,
	"artist_alias_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"disc_id" text,
	"track_number" integer NOT NULL,
	"name" text NOT NULL,
	"name_ja" text,
	"name_en" text,
	"release_date" date,
	"release_year" integer,
	"release_month" integer,
	"release_day" integer,
	"event_id" text,
	"event_day_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_derivations" (
	"id" text PRIMARY KEY NOT NULL,
	"child_track_id" text NOT NULL,
	"parent_track_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_official_songs" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"official_song_id" text,
	"custom_song_name" text,
	"part_position" integer,
	"start_second" real,
	"end_second" real,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_aliases" ADD CONSTRAINT "artist_aliases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_aliases" ADD CONSTRAINT "artist_aliases_alias_type_code_alias_types_code_fk" FOREIGN KEY ("alias_type_code") REFERENCES "public"."alias_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_links" ADD CONSTRAINT "circle_links_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_links" ADD CONSTRAINT "circle_links_platform_code_platforms_code_fk" FOREIGN KEY ("platform_code") REFERENCES "public"."platforms"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_days" ADD CONSTRAINT "event_days_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_series_id_event_series_id_fk" FOREIGN KEY ("event_series_id") REFERENCES "public"."event_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_genre_code_genres_code_fk" FOREIGN KEY ("genre_code") REFERENCES "public"."genres"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_jan_codes" ADD CONSTRAINT "release_jan_codes_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_isrcs" ADD CONSTRAINT "track_isrcs_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_song_links" ADD CONSTRAINT "official_song_links_official_song_id_official_songs_id_fk" FOREIGN KEY ("official_song_id") REFERENCES "public"."official_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_song_links" ADD CONSTRAINT "official_song_links_platform_code_platforms_code_fk" FOREIGN KEY ("platform_code") REFERENCES "public"."platforms"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_songs" ADD CONSTRAINT "official_songs_official_work_id_official_works_id_fk" FOREIGN KEY ("official_work_id") REFERENCES "public"."official_works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_work_links" ADD CONSTRAINT "official_work_links_official_work_id_official_works_id_fk" FOREIGN KEY ("official_work_id") REFERENCES "public"."official_works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_work_links" ADD CONSTRAINT "official_work_links_platform_code_platforms_code_fk" FOREIGN KEY ("platform_code") REFERENCES "public"."platforms"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_works" ADD CONSTRAINT "official_works_category_code_official_work_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."official_work_categories"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_publications" ADD CONSTRAINT "release_publications_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_publications" ADD CONSTRAINT "release_publications_platform_code_platforms_code_fk" FOREIGN KEY ("platform_code") REFERENCES "public"."platforms"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_publications" ADD CONSTRAINT "track_publications_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_publications" ADD CONSTRAINT "track_publications_platform_code_platforms_code_fk" FOREIGN KEY ("platform_code") REFERENCES "public"."platforms"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discs" ADD CONSTRAINT "discs_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_circles" ADD CONSTRAINT "release_circles_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_circles" ADD CONSTRAINT "release_circles_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_event_day_id_event_days_id_fk" FOREIGN KEY ("event_day_id") REFERENCES "public"."event_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_tags" ADD CONSTRAINT "track_tags_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_tags" ADD CONSTRAINT "track_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credit_roles" ADD CONSTRAINT "track_credit_roles_track_credit_id_track_credits_id_fk" FOREIGN KEY ("track_credit_id") REFERENCES "public"."track_credits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credit_roles" ADD CONSTRAINT "track_credit_roles_role_code_credit_roles_code_fk" FOREIGN KEY ("role_code") REFERENCES "public"."credit_roles"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_alias_type_code_alias_types_code_fk" FOREIGN KEY ("alias_type_code") REFERENCES "public"."alias_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_artist_alias_id_artist_aliases_id_fk" FOREIGN KEY ("artist_alias_id") REFERENCES "public"."artist_aliases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_disc_id_discs_id_fk" FOREIGN KEY ("disc_id") REFERENCES "public"."discs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_event_day_id_event_days_id_fk" FOREIGN KEY ("event_day_id") REFERENCES "public"."event_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_derivations" ADD CONSTRAINT "track_derivations_child_track_id_tracks_id_fk" FOREIGN KEY ("child_track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_derivations" ADD CONSTRAINT "track_derivations_parent_track_id_tracks_id_fk" FOREIGN KEY ("parent_track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_official_songs" ADD CONSTRAINT "track_official_songs_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_official_songs" ADD CONSTRAINT "track_official_songs_official_song_id_official_songs_id_fk" FOREIGN KEY ("official_song_id") REFERENCES "public"."official_songs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artist_aliases_artist_id" ON "artist_aliases" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_artist_aliases_alias_type" ON "artist_aliases" USING btree ("alias_type_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_artist_aliases_name" ON "artist_aliases" USING btree ("artist_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_artists_name" ON "artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_artists_sort" ON "artists" USING btree ("sort_name");--> statement-breakpoint
CREATE INDEX "idx_artists_initial" ON "artists" USING btree ("name_initial","initial_script");--> statement-breakpoint
CREATE INDEX "idx_circle_links_circle_id" ON "circle_links" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "idx_circle_links_platform" ON "circle_links" USING btree ("platform_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_circle_links_circle_url" ON "circle_links" USING btree ("circle_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_circles_name" ON "circles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_circles_initial" ON "circles" USING btree ("name_initial","initial_script");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_event_days_event_id" ON "event_days" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_days_date" ON "event_days" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_event_days_event_day_number" ON "event_days" USING btree ("event_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_event_days_event_date" ON "event_days" USING btree ("event_id","date");--> statement-breakpoint
CREATE INDEX "idx_event_series_name" ON "event_series" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_event_series_sort_order" ON "event_series" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_event_series_name" ON "event_series" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_events_event_series_id" ON "events" USING btree ("event_series_id");--> statement-breakpoint
CREATE INDEX "idx_events_edition" ON "events" USING btree ("edition");--> statement-breakpoint
CREATE INDEX "idx_events_start_date" ON "events" USING btree ("start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_events_series_edition" ON "events" USING btree ("event_series_id","edition");--> statement-breakpoint
CREATE INDEX "idx_genres_sort_order" ON "genres" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_track_genres_track" ON "track_genres" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_track_genres_genre" ON "track_genres" USING btree ("genre_code");--> statement-breakpoint
CREATE INDEX "idx_track_genres_track_position" ON "track_genres" USING btree ("track_id","position");--> statement-breakpoint
CREATE INDEX "idx_release_jan_codes_release" ON "release_jan_codes" USING btree ("release_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_release_jan_codes_jan" ON "release_jan_codes" USING btree ("jan_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_release_jan_codes_primary" ON "release_jan_codes" USING btree ("release_id") WHERE "release_jan_codes"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_track_isrcs_track" ON "track_isrcs" USING btree ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_isrcs" ON "track_isrcs" USING btree ("track_id","isrc");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_isrcs_primary" ON "track_isrcs" USING btree ("track_id") WHERE "track_isrcs"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_alias_types_sort_order" ON "alias_types" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_credit_roles_sort_order" ON "credit_roles" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_official_work_categories_sort_order" ON "official_work_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_platforms_category" ON "platforms" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_platforms_sort_order" ON "platforms" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_official_song_links_song_id" ON "official_song_links" USING btree ("official_song_id");--> statement-breakpoint
CREATE INDEX "idx_official_song_links_platform" ON "official_song_links" USING btree ("platform_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_official_song_links_song_url" ON "official_song_links" USING btree ("official_song_id","url");--> statement-breakpoint
CREATE INDEX "idx_official_songs_work" ON "official_songs" USING btree ("official_work_id");--> statement-breakpoint
CREATE INDEX "idx_official_songs_source" ON "official_songs" USING btree ("source_song_id");--> statement-breakpoint
CREATE INDEX "idx_official_work_links_work_id" ON "official_work_links" USING btree ("official_work_id");--> statement-breakpoint
CREATE INDEX "idx_official_work_links_platform" ON "official_work_links" USING btree ("platform_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_official_work_links_work_url" ON "official_work_links" USING btree ("official_work_id","url");--> statement-breakpoint
CREATE INDEX "idx_official_works_category" ON "official_works" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "idx_official_works_release_date" ON "official_works" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_official_works_position" ON "official_works" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_release_publications_release" ON "release_publications" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_release_publications_platform" ON "release_publications" USING btree ("platform_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_release_publications_url" ON "release_publications" USING btree ("release_id","url");--> statement-breakpoint
CREATE INDEX "idx_track_publications_track" ON "track_publications" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_track_publications_platform" ON "track_publications" USING btree ("platform_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_publications_url" ON "track_publications" USING btree ("track_id","url");--> statement-breakpoint
CREATE INDEX "idx_discs_release" ON "discs" USING btree ("release_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_discs_release_number" ON "discs" USING btree ("release_id","disc_number");--> statement-breakpoint
CREATE INDEX "idx_release_circles_release" ON "release_circles" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_release_circles_circle" ON "release_circles" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "idx_release_circles_release_participation" ON "release_circles" USING btree ("release_id","participation_type");--> statement-breakpoint
CREATE INDEX "idx_releases_date" ON "releases" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_releases_year" ON "releases" USING btree ("release_year");--> statement-breakpoint
CREATE INDEX "idx_releases_year_month" ON "releases" USING btree ("release_year","release_month");--> statement-breakpoint
CREATE INDEX "idx_releases_type" ON "releases" USING btree ("release_type");--> statement-breakpoint
CREATE INDEX "idx_releases_event" ON "releases" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_releases_event_day" ON "releases" USING btree ("event_day_id");--> statement-breakpoint
CREATE INDEX "idx_track_tags_track" ON "track_tags" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_track_tags_tag" ON "track_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_track_tags_track_locked_pos" ON "track_tags" USING btree ("track_id","is_locked","position");--> statement-breakpoint
CREATE INDEX "idx_track_credit_roles_credit" ON "track_credit_roles" USING btree ("track_credit_id");--> statement-breakpoint
CREATE INDEX "idx_track_credit_roles_role" ON "track_credit_roles" USING btree ("role_code");--> statement-breakpoint
CREATE INDEX "idx_track_credit_roles_composite" ON "track_credit_roles" USING btree ("track_credit_id","role_code");--> statement-breakpoint
CREATE INDEX "idx_track_credits_track" ON "track_credits" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_track_credits_artist" ON "track_credits" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_track_credits_alias" ON "track_credits" USING btree ("artist_alias_id");--> statement-breakpoint
CREATE INDEX "idx_track_credits_alias_type" ON "track_credits" USING btree ("alias_type_code");--> statement-breakpoint
CREATE INDEX "idx_track_credits_track_artist" ON "track_credits" USING btree ("track_id","artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_credits_no_alias" ON "track_credits" USING btree ("track_id","artist_id") WHERE "track_credits"."artist_alias_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_credits_with_alias" ON "track_credits" USING btree ("track_id","artist_id","artist_alias_id") WHERE "track_credits"."artist_alias_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_tracks_release" ON "tracks" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_disc" ON "tracks" USING btree ("disc_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_date" ON "tracks" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_tracks_year" ON "tracks" USING btree ("release_year");--> statement-breakpoint
CREATE INDEX "idx_tracks_event" ON "tracks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_event_day" ON "tracks" USING btree ("event_day_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_ordering" ON "tracks" USING btree ("release_id","disc_id","track_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tracks_release_tracknumber" ON "tracks" USING btree ("release_id","track_number") WHERE "tracks"."disc_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tracks_disc_tracknumber" ON "tracks" USING btree ("disc_id","track_number") WHERE "tracks"."disc_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_track_derivations_child" ON "track_derivations" USING btree ("child_track_id");--> statement-breakpoint
CREATE INDEX "idx_track_derivations_parent" ON "track_derivations" USING btree ("parent_track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_derivations" ON "track_derivations" USING btree ("child_track_id","parent_track_id");--> statement-breakpoint
CREATE INDEX "idx_track_official_songs_track" ON "track_official_songs" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_track_official_songs_song" ON "track_official_songs" USING btree ("official_song_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_track_official_songs" ON "track_official_songs" USING btree ("track_id","official_song_id","part_position");