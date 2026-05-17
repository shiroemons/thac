import {
	and,
	artists,
	COLLECTION_ITEM_TARGET_TYPES,
	circles,
	createId,
	db,
	eq,
	inArray,
	likeTargetSchema,
	or,
	releases,
	tracks,
	userCollectionItems,
	userCollections,
} from "@thac/db";
import { Hono } from "hono";
import { z } from "zod";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import type { UserAuthContext } from "../../middleware/user-auth";
import { handleDbError } from "../../utils/api-error";

const likesUserRouter = new Hono<UserAuthContext>();

/**
 * target エンティティが存在するか検証する
 */
async function targetEntityExists(
	type: (typeof COLLECTION_ITEM_TARGET_TYPES)[number],
	id: string,
): Promise<boolean> {
	switch (type) {
		case "track": {
			const r = await db
				.select({ id: tracks.id })
				.from(tracks)
				.where(eq(tracks.id, id))
				.limit(1);
			return r.length > 0;
		}
		case "release": {
			const r = await db
				.select({ id: releases.id })
				.from(releases)
				.where(eq(releases.id, id))
				.limit(1);
			return r.length > 0;
		}
		case "circle": {
			const r = await db
				.select({ id: circles.id })
				.from(circles)
				.where(eq(circles.id, id))
				.limit(1);
			return r.length > 0;
		}
		case "artist": {
			const r = await db
				.select({ id: artists.id })
				.from(artists)
				.where(eq(artists.id, id))
				.limit(1);
			return r.length > 0;
		}
	}
}

const checkQuerySchema = z.object({
	items: z
		.string()
		.trim()
		.min(1)
		.transform((s) =>
			s.split(",").map((entry) => {
				const [type, id] = entry.split(":");
				return { type, id };
			}),
		)
		.pipe(
			z
				.array(
					z.object({
						type: z.enum(COLLECTION_ITEM_TARGET_TYPES),
						id: z.string().min(1),
					}),
				)
				.min(1)
				.max(200),
		),
});

// 一括 like チェック（GET /check は GET / より前に定義）
likesUserRouter.get("/check", async (c) => {
	try {
		const queryParse = checkQuerySchema.safeParse({
			items: c.req.query("items") ?? "",
		});
		if (!queryParse.success) {
			return c.json(
				{
					error: "Validation failed",
					code: "VALIDATION_ERROR",
					details: queryParse.error.flatten(),
				},
				400,
			);
		}

		const user = c.get("user");
		const items = queryParse.data.items;

		// default_liked を引く（無ければ全部 false）
		const liked = await db
			.select({ id: userCollections.id })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.userId, user.id),
					eq(userCollections.isDefaultLiked, true),
				),
			)
			.limit(1);

		if (liked.length === 0) {
			return c.json({
				results: items.map(({ type, id }) => ({
					targetType: type,
					targetId: id,
					liked: false,
				})),
			});
		}

		const likedCollectionId = liked[0]?.id ?? "";

		// targetType 別に inArray でフェッチ
		const trackIds = items.filter((i) => i.type === "track").map((i) => i.id);
		const releaseIds = items
			.filter((i) => i.type === "release")
			.map((i) => i.id);
		const circleIds = items.filter((i) => i.type === "circle").map((i) => i.id);
		const artistIds = items.filter((i) => i.type === "artist").map((i) => i.id);

		const conditions = [];
		if (trackIds.length > 0) {
			conditions.push(
				and(
					eq(userCollectionItems.targetType, "track"),
					inArray(userCollectionItems.targetId, trackIds),
				),
			);
		}
		if (releaseIds.length > 0) {
			conditions.push(
				and(
					eq(userCollectionItems.targetType, "release"),
					inArray(userCollectionItems.targetId, releaseIds),
				),
			);
		}
		if (circleIds.length > 0) {
			conditions.push(
				and(
					eq(userCollectionItems.targetType, "circle"),
					inArray(userCollectionItems.targetId, circleIds),
				),
			);
		}
		if (artistIds.length > 0) {
			conditions.push(
				and(
					eq(userCollectionItems.targetType, "artist"),
					inArray(userCollectionItems.targetId, artistIds),
				),
			);
		}

		const likedRows =
			conditions.length > 0
				? await db
						.select({
							targetType: userCollectionItems.targetType,
							targetId: userCollectionItems.targetId,
						})
						.from(userCollectionItems)
						.where(
							and(
								eq(userCollectionItems.collectionId, likedCollectionId),
								or(...conditions),
							),
						)
				: [];

		const likedSet = new Set(
			likedRows.map((r) => `${r.targetType}:${r.targetId}`),
		);

		return c.json({
			results: items.map(({ type, id }) => ({
				targetType: type,
				targetId: id,
				liked: likedSet.has(`${type}:${id}`),
			})),
		});
	} catch (error) {
		return handleDbError(c, error, "GET /user/likes/check");
	}
});

// ♥ 追加: default_liked コレクションへ追加（lazy 作成 + idempotent）
likesUserRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();
		const parsed = likeTargetSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					code: "VALIDATION_ERROR",
					details: parsed.error.flatten(),
				},
				400,
			);
		}

		const user = c.get("user");
		const { targetType, targetId } = parsed.data;

		// target 存在検証
		const exists = await targetEntityExists(targetType, targetId);
		if (!exists) {
			return c.json(
				{
					error: ERROR_MESSAGES.LIKE_TARGET_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const item = await db.transaction(async (tx) => {
			// default_liked を取得（行ロック）または作成
			let likedRows = await tx
				.select()
				.from(userCollections)
				.where(
					and(
						eq(userCollections.userId, user.id),
						eq(userCollections.isDefaultLiked, true),
					),
				)
				.for("update")
				.limit(1);

			if (likedRows.length === 0) {
				const inserted = await tx
					.insert(userCollections)
					.values({
						id: createId.userCollection(),
						userId: user.id,
						kind: "collection",
						name: "Liked",
						visibility: "private",
						ordered: false,
						isDefaultLiked: true,
					})
					.returning();
				likedRows = inserted;
			}

			const collectionId = likedRows[0]?.id ?? "";

			// アイテム追加（重複時は ON CONFLICT DO NOTHING で idempotent 化）
			const result = await tx
				.insert(userCollectionItems)
				.values({
					id: createId.userCollectionItem(),
					collectionId,
					targetType,
					targetId,
					position: null,
				})
				.onConflictDoNothing({
					target: [
						userCollectionItems.collectionId,
						userCollectionItems.targetType,
						userCollectionItems.targetId,
					],
				})
				.returning();

			// onConflictDoNothing が NOOP（既に存在）の場合は既存行を SELECT して返す
			if (result.length === 0) {
				const existing = await tx
					.select()
					.from(userCollectionItems)
					.where(
						and(
							eq(userCollectionItems.collectionId, collectionId),
							eq(userCollectionItems.targetType, targetType),
							eq(userCollectionItems.targetId, targetId),
						),
					)
					.limit(1);
				return { collection: likedRows[0], item: existing[0] };
			}

			return { collection: likedRows[0], item: result[0] };
		});

		return c.json(item, 201);
	} catch (error) {
		return handleDbError(c, error, "POST /user/likes");
	}
});

// ♥ 解除: default_liked から削除（idempotent）
likesUserRouter.delete("/", async (c) => {
	try {
		const body = await c.req.json();
		const parsed = likeTargetSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					code: "VALIDATION_ERROR",
					details: parsed.error.flatten(),
				},
				400,
			);
		}

		const user = c.get("user");
		const { targetType, targetId } = parsed.data;

		// default_liked を引く
		const liked = await db
			.select({ id: userCollections.id })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.userId, user.id),
					eq(userCollections.isDefaultLiked, true),
				),
			)
			.limit(1);

		if (liked.length === 0) {
			// default_liked 自体ないので削除対象もない → 204 で返す（idempotent）
			return c.body(null, 204);
		}

		const likedCollectionId = liked[0]?.id ?? "";

		await db
			.delete(userCollectionItems)
			.where(
				and(
					eq(userCollectionItems.collectionId, likedCollectionId),
					eq(userCollectionItems.targetType, targetType),
					eq(userCollectionItems.targetId, targetId),
				),
			);

		return c.body(null, 204);
	} catch (error) {
		return handleDbError(c, error, "DELETE /user/likes");
	}
});

export { likesUserRouter };
