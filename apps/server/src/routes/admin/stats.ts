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
	genres,
	officialSongs,
	officialWorkCategories,
	officialWorks,
	platforms,
	releases,
	tags,
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
			genresResult,
			tagsResult,
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
			db.select({ count: count() }).from(genres),
			db.select({ count: count() }).from(tags),
		]);

		return c.json({
			users: Number(usersResult[0]?.count ?? 0),
			platforms: Number(platformsResult[0]?.count ?? 0),
			aliasTypes: Number(aliasTypesResult[0]?.count ?? 0),
			creditRoles: Number(creditRolesResult[0]?.count ?? 0),
			officialWorkCategories: Number(
				officialWorkCategoriesResult[0]?.count ?? 0,
			),
			officialWorks: Number(officialWorksResult[0]?.count ?? 0),
			officialSongs: Number(officialSongsResult[0]?.count ?? 0),
			artists: Number(artistsResult[0]?.count ?? 0),
			artistAliases: Number(artistAliasesResult[0]?.count ?? 0),
			circles: Number(circlesResult[0]?.count ?? 0),
			events: Number(eventsResult[0]?.count ?? 0),
			eventSeries: Number(eventSeriesResult[0]?.count ?? 0),
			releases: Number(releasesResult[0]?.count ?? 0),
			tracks: Number(tracksResult[0]?.count ?? 0),
			genres: Number(genresResult[0]?.count ?? 0),
			tags: Number(tagsResult[0]?.count ?? 0),
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/stats");
	}
});

export { statsRouter };
