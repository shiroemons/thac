import { getMeilisearchClient, TRACKS_INDEX_NAME } from "@thac/search";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

// Allowed indexes for settings management
const ALLOWED_INDEXES = [TRACKS_INDEX_NAME] as const;

const settingsRouter = new Hono<AdminContext>();

/**
 * GET /api/admin/search/settings/:index
 * Get settings for a specific index
 */
settingsRouter.get("/:index", async (c) => {
	try {
		const indexName = c.req.param("index");

		// Validate index name
		if (
			!ALLOWED_INDEXES.includes(indexName as (typeof ALLOWED_INDEXES)[number])
		) {
			return c.json({ success: false, error: "Unknown index" }, 400);
		}

		const client = getMeilisearchClient();
		const index = client.index(indexName);
		const settings = await index.getSettings();

		return c.json({
			success: true,
			settings: {
				searchableAttributes: settings.searchableAttributes,
				filterableAttributes: settings.filterableAttributes,
				sortableAttributes: settings.sortableAttributes,
				localizedAttributes: settings.localizedAttributes,
				typoTolerance: settings.typoTolerance,
				displayedAttributes: settings.displayedAttributes,
			},
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to get settings",
			},
			500,
		);
	}
});

/**
 * PUT /api/admin/search/settings/:index
 * Update settings for a specific index
 */
settingsRouter.put("/:index", async (c) => {
	try {
		const indexName = c.req.param("index");
		const body = await c.req.json();

		// Validate index name
		if (
			!ALLOWED_INDEXES.includes(indexName as (typeof ALLOWED_INDEXES)[number])
		) {
			return c.json({ success: false, error: "Unknown index" }, 400);
		}

		const client = getMeilisearchClient();
		const index = client.index(indexName);

		// Only allow updating specific settings
		const updatePayload: Record<string, unknown> = {};

		if (body.searchableAttributes !== undefined) {
			updatePayload.searchableAttributes = body.searchableAttributes;
		}
		if (body.filterableAttributes !== undefined) {
			updatePayload.filterableAttributes = body.filterableAttributes;
		}
		if (body.sortableAttributes !== undefined) {
			updatePayload.sortableAttributes = body.sortableAttributes;
		}
		if (body.localizedAttributes !== undefined) {
			updatePayload.localizedAttributes = body.localizedAttributes;
		}
		if (body.typoTolerance !== undefined) {
			updatePayload.typoTolerance = body.typoTolerance;
		}

		if (Object.keys(updatePayload).length === 0) {
			return c.json(
				{ success: false, error: "No valid settings provided" },
				400,
			);
		}

		// Update settings
		const task = await index.updateSettings(updatePayload);

		return c.json({
			success: true,
			message: "Settings update queued",
			taskUid: task.taskUid,
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to update settings",
			},
			500,
		);
	}
});

/**
 * POST /api/admin/search/settings/:index/reset
 * Reset settings for a specific index to default
 */
settingsRouter.post("/:index/reset", async (c) => {
	try {
		const indexName = c.req.param("index");

		// Validate index name
		if (
			!ALLOWED_INDEXES.includes(indexName as (typeof ALLOWED_INDEXES)[number])
		) {
			return c.json({ success: false, error: "Unknown index" }, 400);
		}

		const client = getMeilisearchClient();
		const index = client.index(indexName);

		// Reset to defaults
		const task = await index.resetSettings();

		return c.json({
			success: true,
			message: "Settings reset queued",
			taskUid: task.taskUid,
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to reset settings",
			},
			500,
		);
	}
});

export { settingsRouter };
