import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { officialSongs, officialWorks } from "./schema/official";

// Load environment variables
dotenv.config({
	path: "../../apps/server/.env",
});

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle({ client });

// TSVファイルをパースする関数
function parseTsv<T>(filePath: string): T[] {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.trim().split("\n");
	const headerLine = lines[0];
	if (!headerLine) return [];
	const headers = headerLine.split("\t");

	return lines.slice(1).map((line) => {
		const values = line.split("\t");
		const record: Record<string, string> = {};
		headers.forEach((header, index) => {
			record[header] = values[index] || "";
		});
		return record as T;
	});
}

// TSVの型定義
interface WorkTsv {
	id: string;
	name: string;
	short_name: string;
	product_type: string;
	series_number: string;
}

interface SongTsv {
	id: string;
	product_id: string;
	track_number: string;
	name: string;
	composer: string;
	arranger: string;
	origin_original_song_id: string;
	is_original: string;
}

async function seed() {
	console.log("Seeding official data...");

	const dataDir = join(import.meta.dir, "data");

	// Seed official works
	console.log("Seeding official_works...");
	const worksData = parseTsv<WorkTsv>(join(dataDir, "official_works.tsv"));

	for (let i = 0; i < worksData.length; i++) {
		const row = worksData[i];
		if (!row) continue;
		await db
			.insert(officialWorks)
			.values({
				id: row.id,
				name: row.name,
				nameJa: row.name,
				shortNameJa: row.short_name || null,
				categoryCode: row.product_type,
				numberInSeries: row.series_number
					? Number.parseFloat(row.series_number)
					: null,
				position: i,
			})
			.onConflictDoUpdate({
				target: officialWorks.id,
				set: {
					name: row.name,
					nameJa: row.name,
					shortNameJa: row.short_name || null,
					categoryCode: row.product_type,
					numberInSeries: row.series_number
						? Number.parseFloat(row.series_number)
						: null,
					position: i,
				},
			});
	}
	console.log(`  ✓ ${worksData.length} official works seeded`);

	// Seed official songs
	console.log("Seeding official_songs...");
	const songsData = parseTsv<SongTsv>(join(dataDir, "official_songs.tsv"));

	for (const row of songsData) {
		await db
			.insert(officialSongs)
			.values({
				id: row.id,
				officialWorkId: row.product_id || null,
				trackNumber: row.track_number
					? Number.parseInt(row.track_number, 10)
					: null,
				name: row.name,
				nameJa: row.name,
				composerName: row.composer || null,
				arrangerName: row.arranger || null,
				isOriginal: row.is_original === "1",
				sourceSongId: row.origin_original_song_id || null,
			})
			.onConflictDoUpdate({
				target: officialSongs.id,
				set: {
					officialWorkId: row.product_id || null,
					trackNumber: row.track_number
						? Number.parseInt(row.track_number, 10)
						: null,
					name: row.name,
					nameJa: row.name,
					composerName: row.composer || null,
					arrangerName: row.arranger || null,
					isOriginal: row.is_original === "1",
					sourceSongId: row.origin_original_song_id || null,
				},
			});
	}
	console.log(`  ✓ ${songsData.length} official songs seeded`);

	console.log("✓ Official data seeding completed!");
}

seed()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("Error seeding official data:", error);
		process.exit(1);
	});
