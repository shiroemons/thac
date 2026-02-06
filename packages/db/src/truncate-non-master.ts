import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Load environment variables
dotenv.config({
	path: "../../apps/server/.env",
});

const client = postgres(
	process.env.DATABASE_URL || "postgresql://localhost:5432/thac",
);

const db = drizzle({ client });

// Non-master tables to truncate
const NON_MASTER_TABLES = [
	"track_derivations",
	"track_official_songs",
	"track_credit_roles",
	"track_credits",
	"track_isrcs",
	"track_publications",
	"tracks",
	"release_jan_codes",
	"release_publications",
	"release_circles",
	"discs",
	"releases",
	"event_days",
	"events",
	"event_series",
	"circle_links",
	"circles",
	"artist_aliases",
	"artists",
] as const;

async function truncateNonMaster() {
	console.log(
		"Truncating non-master data (keeping master data and official works/songs)...\n",
	);

	const tableList = NON_MASTER_TABLES.join(", ");

	console.log("Target tables:");
	for (const table of NON_MASTER_TABLES) {
		console.log(`  - ${table}`);
	}

	// TRUNCATE ... CASCADE handles foreign key dependencies automatically
	console.log(`\nExecuting: TRUNCATE ${tableList} CASCADE`);
	await db.execute(sql.raw(`TRUNCATE ${tableList} CASCADE`));

	console.log("\nTruncated tables:");
	for (const table of NON_MASTER_TABLES) {
		console.log(`  ✓ ${table}: truncated`);
	}

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
	.then(async () => {
		await client.end();
		process.exit(0);
	})
	.catch((error) => {
		console.error("Error truncating data:", error);
		process.exit(1);
	});
