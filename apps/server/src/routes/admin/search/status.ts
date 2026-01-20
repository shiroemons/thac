import { getMeilisearchClient, type IndexStatus } from "@thac/search";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const statusRouter = new Hono<AdminContext>();

/**
 * GET /api/admin/search/status
 * Get status of all indexes
 */
statusRouter.get("/", async (c) => {
	try {
		const client = getMeilisearchClient();
		const indexes = await client.getIndexes();

		const statuses: IndexStatus[] = await Promise.all(
			indexes.results.map(async (idx) => {
				const stats = await idx.getStats();
				return {
					name: idx.uid,
					numberOfDocuments: stats.numberOfDocuments,
					isIndexing: stats.isIndexing,
					lastUpdate: idx.updatedAt?.toISOString() ?? null,
				};
			}),
		);

		return c.json({ success: true, indexes: statuses });
	} catch (error) {
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to get status",
			},
			500,
		);
	}
});

/**
 * GET /api/admin/search/status/:index
 * Get status of specific index
 */
statusRouter.get("/:index", async (c) => {
	try {
		const indexName = c.req.param("index");
		const client = getMeilisearchClient();
		const index = client.index(indexName);
		const stats = await index.getStats();
		const info = await client.getIndex(indexName);

		return c.json({
			success: true,
			status: {
				name: indexName,
				numberOfDocuments: stats.numberOfDocuments,
				isIndexing: stats.isIndexing,
				lastUpdate: info.updatedAt?.toISOString() ?? null,
			},
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to get index status",
			},
			500,
		);
	}
});

export { statusRouter };
