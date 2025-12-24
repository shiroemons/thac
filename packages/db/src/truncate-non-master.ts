import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/libsql";

// Import tables to truncate
import {
	artistAliases,
	artists,
	circleLinks,
	circles,
} from "./schema/artist-circle";
import { eventDays, eventSeries, events } from "./schema/event";
import { releaseJanCodes, trackIsrcs } from "./schema/identifier";
import { releasePublications, trackPublications } from "./schema/publication";
import { discs, releaseCircles, releases } from "./schema/release";
import { trackCreditRoles, trackCredits, tracks } from "./schema/track";
import { trackDerivations, trackOfficialSongs } from "./schema/track-relations";

// Load environment variables
dotenv.config({
	path: "../../apps/server/.env",
});

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle({ client });

async function truncateNonMaster() {
	console.log(
		"Truncating non-master data (keeping master data and official works/songs)...\n",
	);

	// Delete in order considering foreign key constraints
	// Tables that are referenced by other tables should be deleted last

	// 1. Track relations (depend on tracks, no other tables depend on these)
	console.log("1. Deleting track relations...");
	await db.delete(trackDerivations);
	console.log("   ✓ track_derivations: deleted");

	await db.delete(trackOfficialSongs);
	console.log("   ✓ track_official_songs: deleted");

	await db.delete(trackCreditRoles);
	console.log("   ✓ track_credit_roles: deleted");

	await db.delete(trackCredits);
	console.log("   ✓ track_credits: deleted");

	await db.delete(trackIsrcs);
	console.log("   ✓ track_isrcs: deleted");

	await db.delete(trackPublications);
	console.log("   ✓ track_publications: deleted");

	// 2. Tracks (depend on releases/discs)
	console.log("\n2. Deleting tracks...");
	await db.delete(tracks);
	console.log("   ✓ tracks: deleted");

	// 3. Release relations (depend on releases)
	console.log("\n3. Deleting release relations...");
	await db.delete(releaseJanCodes);
	console.log("   ✓ release_jan_codes: deleted");

	await db.delete(releasePublications);
	console.log("   ✓ release_publications: deleted");

	await db.delete(releaseCircles);
	console.log("   ✓ release_circles: deleted");

	await db.delete(discs);
	console.log("   ✓ discs: deleted");

	// 4. Releases (depend on events)
	console.log("\n4. Deleting releases...");
	await db.delete(releases);
	console.log("   ✓ releases: deleted");

	// 5. Events (event_days depend on events, events depend on event_series)
	console.log("\n5. Deleting events...");
	await db.delete(eventDays);
	console.log("   ✓ event_days: deleted");

	await db.delete(events);
	console.log("   ✓ events: deleted");

	await db.delete(eventSeries);
	console.log("   ✓ event_series: deleted");

	// 6. Circles (circle_links depend on circles)
	console.log("\n6. Deleting circles...");
	await db.delete(circleLinks);
	console.log("   ✓ circle_links: deleted");

	await db.delete(circles);
	console.log("   ✓ circles: deleted");

	// 7. Artists (artist_aliases depend on artists)
	console.log("\n7. Deleting artists...");
	await db.delete(artistAliases);
	console.log("   ✓ artist_aliases: deleted");

	await db.delete(artists);
	console.log("   ✓ artists: deleted");

	console.log("\n✓ Truncation completed!");
	console.log("\nKept tables:");
	console.log(
		"  - Master data: platforms, alias_types, credit_roles, official_work_categories",
	);
	console.log(
		"  - Official: official_works, official_songs, official_work_links, official_song_links",
	);
}

truncateNonMaster()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("Error truncating data:", error);
		process.exit(1);
	});
