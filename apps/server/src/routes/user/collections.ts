import {
	addUserCollectionItemSchema,
	and,
	circles,
	count,
	createId,
	createUserCollectionSchema,
	db,
	desc,
	eq,
	max,
	releases,
	reorderUserCollectionItemsSchema,
	tracks,
	updateUserCollectionSchema,
	userCollectionItems,
	userCollections,
} from "@thac/db";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import type { UserAuthContext } from "../../middleware/user-auth";
import { handleDbError } from "../../utils/api-error";
import { loadCollectionItemsWithTargets } from "../../utils/collection-items-loader";

const collectionsUserRouter = new Hono<UserAuthContext>();

// 自分のコレクション一覧取得（kindフィルタ可、アイテム数を含む）
collectionsUserRouter.get("/", async (c) => {
	try {
		const user = c.get("user");
		const kindParam = c.req.query("kind");

		const conditions = [eq(userCollections.userId, user.id)];
		if (kindParam === "collection" || kindParam === "playlist") {
			conditions.push(eq(userCollections.kind, kindParam));
		}

		const rows = await db
			.select({
				id: userCollections.id,
				kind: userCollections.kind,
				name: userCollections.name,
				description: userCollections.description,
				visibility: userCollections.visibility,
				ordered: userCollections.ordered,
				isDefaultLiked: userCollections.isDefaultLiked,
				shortId: userCollections.shortId,
				coverImageUrl: userCollections.coverImageUrl,
				createdAt: userCollections.createdAt,
				updatedAt: userCollections.updatedAt,
				itemCount: count(userCollectionItems.id),
			})
			.from(userCollections)
			.leftJoin(
				userCollectionItems,
				eq(userCollectionItems.collectionId, userCollections.id),
			)
			.where(and(...conditions))
			.groupBy(userCollections.id)
			.orderBy(desc(userCollections.createdAt));

		return c.json({ items: rows });
	} catch (error) {
		return handleDbError(c, error, "GET /user/collections");
	}
});

// コレクション新規作成（最大100件/ユーザーチェック）
collectionsUserRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();
		const parsed = createUserCollectionSchema.safeParse(body);
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

		const existing = await db
			.select({ count: count() })
			.from(userCollections)
			.where(eq(userCollections.userId, user.id));
		const total = Number(existing[0]?.count ?? 0);
		if (total >= 100) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_LIMIT_EXCEEDED,
					code: "VALIDATION_ERROR",
				},
				422,
			);
		}

		const { name, description, kind, visibility, ordered } = parsed.data;
		const shortId =
			visibility === "unlisted" || visibility === "public" ? nanoid(8) : null;

		const inserted = await db
			.insert(userCollections)
			.values({
				id: createId.userCollection(),
				userId: user.id,
				name,
				description: description ?? null,
				kind: kind ?? "collection",
				visibility: visibility ?? "private",
				ordered: ordered ?? false,
				shortId,
			})
			.returning();

		return c.json(inserted[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /user/collections");
	}
});

// コレクション詳細取得（アイテム一覧 + target エンティティ付き）
collectionsUserRouter.get("/:id", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");

		const collectionRows = await db
			.select()
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		const collection = collectionRows[0];

		if (!collection) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const itemsWithTarget = await loadCollectionItemsWithTargets(collectionId);

		return c.json({ ...collection, items: itemsWithTarget });
	} catch (error) {
		return handleDbError(c, error, "GET /user/collections/:id");
	}
});

// コレクション更新（name/description/visibility/ordered）
collectionsUserRouter.patch("/:id", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");

		const body = await c.req.json();
		const parsed = updateUserCollectionSchema.safeParse(body);
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

		const collectionRows = await db
			.select({
				visibility: userCollections.visibility,
				shortId: userCollections.shortId,
			})
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		if (collectionRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const current = collectionRows[0];
		if (!current) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const newVisibility = parsed.data.visibility;

		// visibility が unlisted/public に変わる時に shortId を採番（最大5回リトライ）
		let shortId = current.shortId;
		if (
			newVisibility &&
			newVisibility !== "private" &&
			current.shortId === null
		) {
			let attempts = 0;
			while (shortId === null && attempts < 5) {
				attempts++;
				shortId = nanoid(8);
			}
		}

		const updateValues: Record<string, unknown> = {};
		if (parsed.data.name !== undefined) updateValues.name = parsed.data.name;
		if (parsed.data.description !== undefined)
			updateValues.description = parsed.data.description;
		if (parsed.data.visibility !== undefined)
			updateValues.visibility = parsed.data.visibility;
		if (parsed.data.ordered !== undefined)
			updateValues.ordered = parsed.data.ordered;
		if (shortId !== current.shortId) updateValues.shortId = shortId;

		const updated = await db
			.update(userCollections)
			.set(updateValues)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.returning();

		const result = updated[0];
		if (!result) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "PATCH /user/collections/:id");
	}
});

// コレクション削除（is_default_liked=true は 403）
collectionsUserRouter.delete("/:id", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");

		const collectionRows = await db
			.select({ isDefaultLiked: userCollections.isDefaultLiked })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		if (collectionRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const collection = collectionRows[0];
		if (!collection) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		if (collection.isDefaultLiked) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_DEFAULT_LIKED_DELETE_FORBIDDEN,
					code: "FORBIDDEN",
				},
				403,
			);
		}

		await db
			.delete(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			);

		return c.body(null, 204);
	} catch (error) {
		return handleDbError(c, error, "DELETE /user/collections/:id");
	}
});

// アイテム追加（最大1000件/コレクション、target 存在検証）
collectionsUserRouter.post("/:id/items", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");

		const body = await c.req.json();
		const parsed = addUserCollectionItemSchema.safeParse(body);
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

		// コレクション存在 & 所有確認
		const collectionRows = await db
			.select({ ordered: userCollections.ordered })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		if (collectionRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const collectionMeta = collectionRows[0];
		if (!collectionMeta) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		// アイテム数上限チェック
		const existingItems = await db
			.select({ count: count() })
			.from(userCollectionItems)
			.where(eq(userCollectionItems.collectionId, collectionId));
		const itemTotal = Number(existingItems[0]?.count ?? 0);
		if (itemTotal >= 1000) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_ITEM_LIMIT_EXCEEDED,
					code: "VALIDATION_ERROR",
				},
				422,
			);
		}

		// target 存在検証
		const { targetType, targetId, note } = parsed.data;
		let exists = false;

		switch (targetType) {
			case "track": {
				const r = await db
					.select({ id: tracks.id })
					.from(tracks)
					.where(eq(tracks.id, targetId))
					.limit(1);
				exists = r.length > 0;
				break;
			}
			case "release": {
				const r = await db
					.select({ id: releases.id })
					.from(releases)
					.where(eq(releases.id, targetId))
					.limit(1);
				exists = r.length > 0;
				break;
			}
			case "circle": {
				const r = await db
					.select({ id: circles.id })
					.from(circles)
					.where(eq(circles.id, targetId))
					.limit(1);
				exists = r.length > 0;
				break;
			}
		}

		if (!exists) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_TARGET_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		// ordered=true の場合、末尾 position を採番（max+1）
		let position: number | null = null;
		if (collectionMeta.ordered) {
			const maxResult = await db
				.select({ maxPosition: max(userCollectionItems.position) })
				.from(userCollectionItems)
				.where(eq(userCollectionItems.collectionId, collectionId));
			const maxPos = maxResult[0]?.maxPosition;
			position = maxPos !== null && maxPos !== undefined ? maxPos + 1 : 0;
		}

		const inserted = await db
			.insert(userCollectionItems)
			.values({
				id: createId.userCollectionItem(),
				collectionId,
				targetType,
				targetId,
				note: note ?? null,
				position,
			})
			.returning();

		return c.json(inserted[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /user/collections/:id/items");
	}
});

// アイテム削除
collectionsUserRouter.delete("/:id/items/:itemId", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");
		const itemId = c.req.param("itemId");

		// コレクション所有確認
		const collectionRows = await db
			.select({ id: userCollections.id })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		if (collectionRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		// アイテム存在確認
		const itemRows = await db
			.select({ id: userCollectionItems.id })
			.from(userCollectionItems)
			.where(
				and(
					eq(userCollectionItems.id, itemId),
					eq(userCollectionItems.collectionId, collectionId),
				),
			)
			.limit(1);

		if (itemRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_ITEM_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		await db
			.delete(userCollectionItems)
			.where(
				and(
					eq(userCollectionItems.id, itemId),
					eq(userCollectionItems.collectionId, collectionId),
				),
			);

		return c.body(null, 204);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /user/collections/:id/items/:itemId",
		);
	}
});

// アイテム並び替え一括更新
collectionsUserRouter.patch("/:id/items/reorder", async (c) => {
	try {
		const user = c.get("user");
		const collectionId = c.req.param("id");

		const body = await c.req.json();
		const parsed = reorderUserCollectionItemsSchema.safeParse(body);
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

		// コレクション存在 & 所有確認
		const collectionRows = await db
			.select({ ordered: userCollections.ordered })
			.from(userCollections)
			.where(
				and(
					eq(userCollections.id, collectionId),
					eq(userCollections.userId, user.id),
				),
			)
			.limit(1);

		if (collectionRows.length === 0) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		const collectionMeta = collectionRows[0];
		if (!collectionMeta) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_NOT_FOUND,
					code: "NOT_FOUND",
				},
				404,
			);
		}

		if (!collectionMeta.ordered) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_REORDER_NOT_ORDERED,
					code: "VALIDATION_ERROR",
				},
				422,
			);
		}

		// 既存アイテム全件取得して検証
		const existingItems = await db
			.select({ id: userCollectionItems.id })
			.from(userCollectionItems)
			.where(eq(userCollectionItems.collectionId, collectionId));

		const existingIds = existingItems.map((i) => i.id).sort();
		const requestedIds = parsed.data.items.map((i) => i.itemId).sort();

		// itemId 集合が一致するか検証
		const idsMatch =
			existingIds.length === requestedIds.length &&
			existingIds.every((id, idx) => id === requestedIds[idx]);

		if (!idsMatch) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_REORDER_INVALID,
					code: "VALIDATION_ERROR",
				},
				422,
			);
		}

		// position が 0 から N-1 の連番で重複なしか検証
		const positions = parsed.data.items
			.map((i) => i.position)
			.sort((a, b) => a - b);
		const isValidPositions = positions.every((pos, idx) => pos === idx);

		if (!isValidPositions) {
			return c.json(
				{
					error: ERROR_MESSAGES.COLLECTION_REORDER_INVALID,
					code: "VALIDATION_ERROR",
				},
				422,
			);
		}

		// トランザクション内で一括更新
		await db.transaction(async (tx) => {
			for (const { itemId, position } of parsed.data.items) {
				await tx
					.update(userCollectionItems)
					.set({ position })
					.where(
						and(
							eq(userCollectionItems.id, itemId),
							eq(userCollectionItems.collectionId, collectionId),
						),
					);
			}
		});

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(c, error, "PATCH /user/collections/:id/items/reorder");
	}
});

export { collectionsUserRouter };
