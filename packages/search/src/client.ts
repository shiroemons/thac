import { MeiliSearch } from "meilisearch";

let client: MeiliSearch | null = null;

/**
 * Get or create Meilisearch client singleton
 */
export function getMeilisearchClient(): MeiliSearch {
	if (!client) {
		const host = process.env.MEILI_URL || "http://localhost:7700";
		const apiKey = process.env.MEILI_MASTER_KEY || "";

		client = new MeiliSearch({ host, apiKey });
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
