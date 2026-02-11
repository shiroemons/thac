import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { officialSongLinks, officialWorkLinks } from "./schema/official";
import { createId } from "./utils/id";
import { createScriptClient } from "./utils/script-client";

const { client, db } = createScriptClient();

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
interface WorkLinkTsv {
	official_work_id: string;
	name: string;
	spotify_url: string;
	apple_music_url: string;
	youtube_music_url: string;
	line_music_url: string;
}

interface SongLinkTsv {
	official_song_id: string;
	name: string;
	spotify_url: string;
	apple_music_url: string;
	youtube_music_url: string;
	line_music_url: string;
}

// URLカラム名からプラットフォームコードへのマッピング
const platformMapping: Record<string, { code: string; sortOrder: number }> = {
	spotify_url: { code: "spotify", sortOrder: 0 },
	apple_music_url: { code: "apple_music", sortOrder: 1 },
	youtube_music_url: { code: "youtube_music", sortOrder: 2 },
	line_music_url: { code: "line_music", sortOrder: 3 },
};

async function seed() {
	console.log("Seeding official links data...");

	const dataDir = join(import.meta.dir, "data");

	// Seed official work links (batch)
	console.log("Seeding official_work_links...");
	const workLinksData = parseTsv<WorkLinkTsv>(
		join(dataDir, "official_work_links.tsv"),
	);

	const workLinkValues: {
		id: string;
		officialWorkId: string;
		platformCode: string;
		url: string;
		sortOrder: number;
	}[] = [];
	for (const row of workLinksData) {
		for (const [urlKey, platform] of Object.entries(platformMapping)) {
			const url = row[urlKey as keyof WorkLinkTsv];
			if (url) {
				workLinkValues.push({
					id: createId.officialWorkLink(),
					officialWorkId: row.official_work_id,
					platformCode: platform.code,
					url: url,
					sortOrder: platform.sortOrder,
				});
			}
		}
	}

	if (workLinkValues.length > 0) {
		await db
			.insert(officialWorkLinks)
			.values(workLinkValues)
			.onConflictDoUpdate({
				target: [officialWorkLinks.officialWorkId, officialWorkLinks.url],
				set: {
					platformCode: sql`excluded.platform_code`,
					sortOrder: sql`excluded.sort_order`,
				},
			});
	}
	console.log(`  ✓ ${workLinkValues.length} official work links seeded`);

	// Seed official song links (batch)
	console.log("Seeding official_song_links...");
	const songLinksData = parseTsv<SongLinkTsv>(
		join(dataDir, "official_song_links.tsv"),
	);

	const songLinkValues: {
		id: string;
		officialSongId: string;
		platformCode: string;
		url: string;
		sortOrder: number;
	}[] = [];
	for (const row of songLinksData) {
		for (const [urlKey, platform] of Object.entries(platformMapping)) {
			const url = row[urlKey as keyof SongLinkTsv];
			if (url) {
				songLinkValues.push({
					id: createId.officialSongLink(),
					officialSongId: row.official_song_id,
					platformCode: platform.code,
					url: url,
					sortOrder: platform.sortOrder,
				});
			}
		}
	}

	if (songLinkValues.length > 0) {
		await db
			.insert(officialSongLinks)
			.values(songLinkValues)
			.onConflictDoUpdate({
				target: [officialSongLinks.officialSongId, officialSongLinks.url],
				set: {
					platformCode: sql`excluded.platform_code`,
					sortOrder: sql`excluded.sort_order`,
				},
			});
	}
	console.log(`  ✓ ${songLinkValues.length} official song links seeded`);

	console.log("✓ Official links data seeding completed!");
}

seed()
	.then(async () => {
		await client.end({ timeout: 2 });
		process.exit(0);
	})
	.catch((error) => {
		console.error("Error seeding official links data:", error);
		process.exit(1);
	});
