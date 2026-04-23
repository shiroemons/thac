import { Meilisearch } from "meilisearch";

let client: Meilisearch | null = null;

// Health check cache
const HEALTH_CHECK_CACHE_TTL_MS = 30_000;
let healthCache: { isAvailable: boolean; checkedAt: number } | null = null;

/**
 * Get or create Meilisearch client singleton
 */
export function getMeilisearchClient(): Meilisearch {
	if (!client) {
		const host = process.env.MEILI_URL || "http://localhost:7700";
		const apiKey = process.env.MEILI_MASTER_KEY || "";

		client = new Meilisearch({ host, apiKey });
	}
	return client;
}

/**
 * Check Meilisearch connection health
 */
export async function checkHealth(): Promise<{
	status: string;
	version: string;
}> {
	const meili = getMeilisearchClient();
	const health = await meili.health();
	const version = await meili.getVersion();
	return {
		status: health.status,
		version: version.pkgVersion,
	};
}

/**
 * Reset client (useful for testing)
 */
export function resetClient(): void {
	client = null;
}

/**
 * Check if Meilisearch is available with caching (TTL: 30 seconds)
 * Logs unavailability message at most once per 30 seconds
 */
export async function isMeilisearchAvailable(): Promise<boolean> {
	const now = Date.now();

	// Check cache
	if (healthCache && now - healthCache.checkedAt < HEALTH_CHECK_CACHE_TTL_MS) {
		return healthCache.isAvailable;
	}

	// Cache miss - check Meilisearch health
	try {
		const meili = getMeilisearchClient();
		await meili.health();
		healthCache = { isAvailable: true, checkedAt: now };
		return true;
	} catch {
		// Log only when cache is expired or first check
		console.error(
			"[Meilisearch] Service unavailable, skipping sync operations",
		);
		healthCache = { isAvailable: false, checkedAt: now };
		return false;
	}
}

/**
 * Check if a Meilisearch index exists
 * @returns true if the index exists, false if not found
 */
export async function isIndexExists(indexName: string): Promise<boolean> {
	try {
		const meili = getMeilisearchClient();
		await meili.getIndex(indexName);
		return true;
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as { code: string }).code === "index_not_found"
		) {
			return false;
		}
		throw error;
	}
}

/**
 * Reset health cache (useful for testing)
 */
export function resetHealthCache(): void {
	healthCache = null;
}
