CREATE TABLE "user_collection_items" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"position" integer,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_user_collection_items_target_type" CHECK ("target_type" IN ('circle','release','track'))
);
--> statement-breakpoint
CREATE TABLE "user_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'collection' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"ordered" boolean DEFAULT false NOT NULL,
	"is_default_liked" boolean DEFAULT false NOT NULL,
	"short_id" text,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_user_collections_kind" CHECK ("kind" IN ('collection','playlist')),
	CONSTRAINT "check_user_collections_visibility" CHECK ("visibility" IN ('private','unlisted','public'))
);
--> statement-breakpoint
ALTER TABLE "user_collection_items" ADD CONSTRAINT "user_collection_items_collection_id_user_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."user_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_collection_items_unique" ON "user_collection_items" USING btree ("collection_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_user_collection_items_target" ON "user_collection_items" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_user_collection_items_position" ON "user_collection_items" USING btree ("collection_id","position") WHERE "user_collection_items"."position" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_user_collections_user_kind" ON "user_collections" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_collections_default_liked" ON "user_collections" USING btree ("user_id") WHERE "user_collections"."is_default_liked" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_collections_short_id" ON "user_collections" USING btree ("short_id") WHERE "user_collections"."short_id" IS NOT NULL;