import {
	countTracksForIndexing,
	fetchTracksForIndexing,
	getMeilisearchClient,
	type ReindexProgress,
	TRACKS_INDEX_NAME,
	tracksIndexConfig,
} from "@thac/search";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AdminContext } from "../../../middleware/admin-auth";

const reindexRouter = new Hono<AdminContext>();

/**
 * Reindex tracks into Meilisearch
 */
async function reindexTracks(
	onProgress: (progress: ReindexProgress) => Promise<void>,
): Promise<void> {
	const client = getMeilisearchClient();

	// Prepare index
	await onProgress({
		index: TRACKS_INDEX_NAME,
		phase: "fetching",
		current: 0,
		total: 0,
		message: "Preparing index...",
	});

	// Get or create index
	const index = client.index(TRACKS_INDEX_NAME);

	// Update settings
	await index.updateSettings({
		searchableAttributes: tracksIndexConfig.searchableAttributes,
		filterableAttributes: tracksIndexConfig.filterableAttributes,
		sortableAttributes: tracksIndexConfig.sortableAttributes,
		localizedAttributes: tracksIndexConfig.locales
			? [{ locales: tracksIndexConfig.locales, attributePatterns: ["*"] }]
			: undefined,
		typoTolerance: tracksIndexConfig.typoTolerance,
	});

	// Clear existing documents
	await onProgress({
		index: TRACKS_INDEX_NAME,
		phase: "fetching",
		current: 0,
		total: 0,
		message: "Clearing existing documents...",
	});
	await index.deleteAllDocuments();

	// Count total tracks
	const totalTracks = await countTracksForIndexing();

	await onProgress({
		index: TRACKS_INDEX_NAME,
		phase: "fetching",
		current: 0,
		total: totalTracks,
		message: `Found ${totalTracks} tracks to index`,
	});

	// Fetch and index in batches
	let totalIndexed = 0;
	for await (const batch of fetchTracksForIndexing(1000)) {
		await onProgress({
			index: TRACKS_INDEX_NAME,
			phase: "indexing",
			current: totalIndexed,
			total: totalTracks,
			message: `Indexing batch of ${batch.length} tracks...`,
		});

		await index.addDocuments(batch, {
			primaryKey: tracksIndexConfig.primaryKey,
		});
		totalIndexed += batch.length;
	}

	await onProgress({
		index: TRACKS_INDEX_NAME,
		phase: "completed",
		current: totalIndexed,
		total: totalIndexed,
		message: `Indexed ${totalIndexed} tracks`,
	});
}

/**
 * POST /api/admin/search/reindex
 * Reindex all indexes (currently only tracks)
 */
reindexRouter.post("/", async (c) => {
	return streamSSE(c, async (stream) => {
		let eventId = 0;

		const sendProgress = async (progress: ReindexProgress) => {
			await stream.writeSSE({
				id: String(eventId++),
				event: "progress",
				data: JSON.stringify(progress),
			});
		};

		try {
			// Reindex tracks
			await reindexTracks(sendProgress);

			await stream.writeSSE({
				id: String(eventId++),
				event: "result",
				data: JSON.stringify({ success: true, message: "Reindex completed" }),
			});
		} catch (error) {
			await stream.writeSSE({
				id: String(eventId++),
				event: "error",
				data: JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : "Reindex failed",
				}),
			});
		}
	});
});

/**
 * POST /api/admin/search/reindex/:index
 * Reindex specific index
 */
reindexRouter.post("/:index", async (c) => {
	const indexName = c.req.param("index");

	if (indexName !== TRACKS_INDEX_NAME) {
		return c.json({ success: false, error: "Unknown index" }, 400);
	}

	return streamSSE(c, async (stream) => {
		let eventId = 0;

		const sendProgress = async (progress: ReindexProgress) => {
			await stream.writeSSE({
				id: String(eventId++),
				event: "progress",
				data: JSON.stringify(progress),
			});
		};

		try {
			await reindexTracks(sendProgress);

			await stream.writeSSE({
				id: String(eventId++),
				event: "result",
				data: JSON.stringify({ success: true, message: "Reindex completed" }),
			});
		} catch (error) {
			await stream.writeSSE({
				id: String(eventId++),
				event: "error",
				data: JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : "Reindex failed",
				}),
			});
		}
	});
});

export { reindexRouter };
