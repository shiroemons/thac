CREATE TABLE "album_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_type" text NOT NULL,
	"existing_release_id" text,
	"album_name" text,
	"circle_name" text,
	"reference_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" text,
	"reviewer_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_album_request_status" CHECK (status IN ('pending','approved','rejected')),
	CONSTRAINT "check_album_request_type" CHECK (request_type IN ('new','existing')),
	CONSTRAINT "check_album_request_type_consistency" CHECK ((request_type='existing' AND existing_release_id IS NOT NULL)
        OR (request_type='new' AND album_name IS NOT NULL)),
	CONSTRAINT "check_album_request_review_consistency" CHECK ((status='pending' AND reviewed_at IS NULL AND reviewed_by_user_id IS NULL)
        OR (status<>'pending' AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "album_requests" ADD CONSTRAINT "album_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_requests" ADD CONSTRAINT "album_requests_existing_release_id_releases_id_fk" FOREIGN KEY ("existing_release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_requests" ADD CONSTRAINT "album_requests_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_album_requests_user" ON "album_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_album_requests_existing_release" ON "album_requests" USING btree ("existing_release_id");--> statement-breakpoint
CREATE INDEX "idx_album_requests_status" ON "album_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_album_requests_created_at" ON "album_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_album_requests_status_created_at" ON "album_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_album_requests_reviewed_by" ON "album_requests" USING btree ("reviewed_by_user_id");