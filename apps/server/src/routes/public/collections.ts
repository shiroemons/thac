import { db, eq, user, userCollections } from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import { loadCollectionItemsWithTargets } from "../../utils/collection-items-loader";

const publicCollectionsRouter = new Hono();

// 公開コレクション詳細取得（unlisted/public のみ閲覧可、private は 404）
publicCollectionsRouter.get("/:shortId", async (c) => {
	try {
		const shortId = c.req.param("shortId");

		const collectionRows = await db
			.select({
				id: userCollections.id,
				name: userCollections.name,
				description: userCollections.description,
				kind: userCollections.kind,
				visibility: userCollections.visibility,
				ordered: userCollections.ordered,
				shortId: userCollections.shortId,
				createdAt: userCollections.createdAt,
				updatedAt: userCollections.updatedAt,
				userId: userCollections.userId,
			})
			.from(userCollections)
			.where(eq(userCollections.shortId, shortId))
			.limit(1);

		const collection = collectionRows[0];

		if (!collection) {
			return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
		}

		// private は 404 で隠蔽（情報漏洩防止）
		if (collection.visibility === "private") {
			return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
		}

		// owner 情報を取得
		const ownerRows = await db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.id, collection.userId))
			.limit(1);

		const owner = ownerRows[0] ?? {
			id: collection.userId,
			name: "不明なユーザー",
		};

		const items = await loadCollectionItemsWithTargets(collection.id);

		const { userId: _, ...collectionWithoutUserId } = collection;

		return c.json({ collection: { ...collectionWithoutUserId, owner }, items });
	} catch (error) {
		return handleDbError(c, error, "GET /public/collections/:shortId");
	}
});

export { publicCollectionsRouter };
