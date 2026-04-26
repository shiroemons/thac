import { type InferSelectModel, relations, sql } from "drizzle-orm";
import {
	check,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { releases } from "./release";

// アルバム申請ステータスの定義
export const ALBUM_REQUEST_STATUSES = [
	"pending",
	"approved",
	"rejected",
] as const;

export type AlbumRequestStatus = (typeof ALBUM_REQUEST_STATUSES)[number];

// アルバム申請タイプの定義
export const ALBUM_REQUEST_TYPES = ["new", "existing"] as const;

export type AlbumRequestType = (typeof ALBUM_REQUEST_TYPES)[number];

// 参考URL型
export type AlbumRequestReferenceUrl = { url: string; label?: string };

// アルバム申請テーブル
export const albumRequests = pgTable(
	"album_requests",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		requestType: text("request_type").notNull(),
		existingReleaseId: text("existing_release_id").references(
			() => releases.id,
			{ onDelete: "set null" },
		),
		albumName: text("album_name"),
		circleName: text("circle_name"),
		referenceUrls: jsonb("reference_urls")
			.$type<AlbumRequestReferenceUrl[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		notes: text("notes"),
		status: text("status").notNull().default("pending"),
		reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		reviewerNotes: text("reviewer_notes"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_album_requests_user").on(table.userId),
		index("idx_album_requests_existing_release").on(table.existingReleaseId),
		index("idx_album_requests_status").on(table.status),
		index("idx_album_requests_created_at").on(table.createdAt),
		index("idx_album_requests_status_created_at").on(
			table.status,
			table.createdAt,
		),
		index("idx_album_requests_reviewed_by").on(table.reviewedByUserId),
		check(
			"check_album_request_status",
			sql`status IN ('pending','approved','rejected')`,
		),
		check("check_album_request_type", sql`request_type IN ('new','existing')`),
		check(
			"check_album_request_type_consistency",
			sql`(request_type='existing' AND existing_release_id IS NOT NULL)
        OR (request_type='new' AND album_name IS NOT NULL)`,
		),
		check(
			"check_album_request_review_consistency",
			sql`(status='pending' AND reviewed_at IS NULL AND reviewed_by_user_id IS NULL)
        OR (status<>'pending' AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)`,
		),
	],
);

// リレーション定義
export const albumRequestRelations = relations(albumRequests, ({ one }) => ({
	user: one(user, {
		fields: [albumRequests.userId],
		references: [user.id],
		relationName: "albumRequestUser",
	}),
	reviewer: one(user, {
		fields: [albumRequests.reviewedByUserId],
		references: [user.id],
		relationName: "albumRequestReviewer",
	}),
	existingRelease: one(releases, {
		fields: [albumRequests.existingReleaseId],
		references: [releases.id],
	}),
}));

// Type exports
export type AlbumRequest = InferSelectModel<typeof albumRequests>;
