import {
	aliasTypes,
	artistAliases,
	artists,
	circles,
	count,
	creditRoles,
	db,
	eventSeries,
	events,
	officialSongs,
	officialWorkCategories,
	officialWorks,
	platforms,
	releases,
	tracks,
	user,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../middleware/admin-auth";
import { handleDbError } from "../../utils/api-error";

const statsRouter = new Hono<AdminContext>();

// 統計情報取得
statsRouter.get("/", async (c) => {
	try {
		const [
			usersResult,
			platformsResult,
			aliasTypesResult,
			creditRolesResult,
			officialWorkCategoriesResult,
			officialWorksResult,
			officialSongsResult,
			artistsResult,
			artistAliasesResult,
			circlesResult,
			eventsResult,
			eventSeriesResult,
			releasesResult,
			tracksResult,
		] = await Promise.all([
			db.select({ count: count() }).from(user),
			db.select({ count: count() }).from(platforms),
			db.select({ count: count() }).from(aliasTypes),
			db.select({ count: count() }).from(creditRoles),
			db.select({ count: count() }).from(officialWorkCategories),
			db.select({ count: count() }).from(officialWorks),
			db.select({ count: count() }).from(officialSongs),
			db.select({ count: count() }).from(artists),
			db.select({ count: count() }).from(artistAliases),
			db.select({ count: count() }).from(circles),
			db.select({ count: count() }).from(events),
			db.select({ count: count() }).from(eventSeries),
			db.select({ count: count() }).from(releases),
			db.select({ count: count() }).from(tracks),
		]);

		return c.json({
			users: usersResult[0]?.count ?? 0,
			platforms: platformsResult[0]?.count ?? 0,
			aliasTypes: aliasTypesResult[0]?.count ?? 0,
			creditRoles: creditRolesResult[0]?.count ?? 0,
			officialWorkCategories: officialWorkCategoriesResult[0]?.count ?? 0,
			officialWorks: officialWorksResult[0]?.count ?? 0,
			officialSongs: officialSongsResult[0]?.count ?? 0,
			artists: artistsResult[0]?.count ?? 0,
			artistAliases: artistAliasesResult[0]?.count ?? 0,
			circles: circlesResult[0]?.count ?? 0,
			events: eventsResult[0]?.count ?? 0,
			eventSeries: eventSeriesResult[0]?.count ?? 0,
			releases: releasesResult[0]?.count ?? 0,
			tracks: tracksResult[0]?.count ?? 0,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/stats");
	}
});

export { statsRouter };
