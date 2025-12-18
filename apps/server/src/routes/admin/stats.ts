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
	user,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../middleware/admin-auth";

const statsRouter = new Hono<AdminContext>();

// 統計情報取得
statsRouter.get("/", async (c) => {
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
	});
});

export { statsRouter };
