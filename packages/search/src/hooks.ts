import {
	getMeilisearchClient,
	isIndexExists,
	isMeilisearchAvailable,
} from "./client";
import { TRACKS_INDEX_NAME } from "./indexes/tracks";
import { getIndexQueue } from "./queue";
import {
	fetchTrackForIndexing,
	fetchTracksForIndexingByIds,
} from "./transformers/track";
import type { TrackSearchDocument } from "./types";

/**
 * Queue a track for indexing after creation or update
 */
export async function queueTrackIndexing(trackId: string): Promise<void> {
	if (!(await isMeilisearchAvailable())) {
		return;
	}
	try {
		const document = await fetchTrackForIndexing(trackId);
		if (document) {
			const queue = getIndexQueue();
			queue.addDocuments<TrackSearchDocument>(TRACKS_INDEX_NAME, [document]);
		}
	} catch (error) {
		console.error(`[SearchHooks] Failed to queue track ${trackId}:`, error);
	}
}

/**
 * Queue multiple tracks for indexing
 */
export async function queueTracksIndexing(trackIds: string[]): Promise<void> {
	if (!(await isMeilisearchAvailable())) {
		return;
	}
	try {
		const documents: TrackSearchDocument[] = [];
		for (const trackId of trackIds) {
			const document = await fetchTrackForIndexing(trackId);
			if (document) {
				documents.push(document);
			}
		}
		if (documents.length > 0) {
			const queue = getIndexQueue();
			queue.addDocuments<TrackSearchDocument>(TRACKS_INDEX_NAME, documents);
		}
	} catch (error) {
		console.error("[SearchHooks] Failed to queue tracks:", error);
	}
}

/**
 * Queue a track for deletion from the index
 */
export async function queueTrackDeletion(trackId: string): Promise<void> {
	if (!(await isMeilisearchAvailable())) {
		return;
	}
	const queue = getIndexQueue();
	queue.deleteDocuments(TRACKS_INDEX_NAME, [trackId]);
}

/**
 * Queue multiple tracks for deletion
 */
export async function queueTracksDeletion(trackIds: string[]): Promise<void> {
	if (!(await isMeilisearchAvailable())) {
		return;
	}
	const queue = getIndexQueue();
	queue.deleteDocuments(TRACKS_INDEX_NAME, trackIds);
}

/**
 * Flush the queue immediately (useful for testing or shutdown)
 */
export async function flushIndexQueue(): Promise<void> {
	if (!(await isMeilisearchAvailable())) {
		return;
	}
	const queue = getIndexQueue();
	await queue.flush();
}

/**
 * Sync specific tracks to Meilisearch search index (bulk operation)
 * Used after legacy CSV import to index newly created tracks
 * Returns null if Meilisearch is unavailable or index doesn't exist
 */
export async function syncTracksToSearchIndex(
	trackIds: string[],
	onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; errors: string[] } | null> {
	if (!(await isMeilisearchAvailable())) {
		return null;
	}

	if (!(await isIndexExists(TRACKS_INDEX_NAME))) {
		return null;
	}

	const meili = getMeilisearchClient();
	const index = meili.index(TRACKS_INDEX_NAME);
	let synced = 0;
	const errors: string[] = [];

	try {
		for await (const documents of fetchTracksForIndexingByIds(trackIds)) {
			try {
				await index.addDocuments(documents);
				synced += documents.length;
				onProgress?.(synced, trackIds.length);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				errors.push(`Batch sync failed (${documents.length} docs): ${message}`);
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		errors.push(`Search sync iteration failed: ${message}`);
	}

	return { synced, errors };
}
