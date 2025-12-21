import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import {
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	platforms,
} from "./schema/master";

// Load environment variables
dotenv.config({
	path: "../../apps/server/.env",
});

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle({ client });

// 初期データ定義
const platformsData = [
	// ストリーミング
	{
		code: "spotify",
		name: "Spotify",
		category: "streaming",
		urlPattern: "^https?://open\\.spotify\\.com/",
	},
	{
		code: "apple_music",
		name: "Apple Music",
		category: "streaming",
		urlPattern: "^https?://music\\.apple\\.com/",
	},
	{
		code: "youtube_music",
		name: "YouTube Music",
		category: "streaming",
		urlPattern: "^https?://music\\.youtube\\.com/",
	},
	{
		code: "line_music",
		name: "LINE MUSIC",
		category: "streaming",
		urlPattern: "^https?://music\\.line\\.me/",
	},
	{
		code: "soundcloud",
		name: "SoundCloud",
		category: "streaming",
		urlPattern: "^https?://soundcloud\\.com/",
	},
	{
		code: "amazon_music",
		name: "Amazon Music",
		category: "streaming",
		urlPattern: "^https?://music\\.amazon\\.(co\\.jp|com)/",
	},
	{
		code: "awa",
		name: "AWA",
		category: "streaming",
		urlPattern: "^https?://s\\.awa\\.fm/",
	},
	{
		code: "rakuten_music",
		name: "Rakuten Music",
		category: "streaming",
		urlPattern: "^https?://music\\.rakuten\\.co\\.jp/",
	},
	{
		code: "deezer",
		name: "Deezer",
		category: "streaming",
		urlPattern: "^https?://(www\\.)?deezer\\.com/",
	},
	{
		code: "tidal",
		name: "TIDAL",
		category: "streaming",
		urlPattern: "^https?://(listen\\.)?tidal\\.com/",
	},
	// 動画
	{
		code: "youtube",
		name: "YouTube",
		category: "video",
		urlPattern: "^https?://(www\\.)?youtube\\.com/|^https?://youtu\\.be/",
	},
	{
		code: "nicovideo",
		name: "ニコニコ動画",
		category: "video",
		urlPattern: "^https?://(www\\.)?nicovideo\\.jp/",
	},
	// ダウンロード販売
	{
		code: "bandcamp",
		name: "Bandcamp",
		category: "download",
		urlPattern: "^https?://[a-zA-Z0-9-]+\\.bandcamp\\.com/",
	},
	{
		code: "booth",
		name: "BOOTH",
		category: "download",
		urlPattern: "^https?://([a-zA-Z0-9-]+\\.)?booth\\.pm/",
	},
	{
		code: "dlsite",
		name: "DLsite",
		category: "download",
		urlPattern: "^https?://(www\\.)?dlsite\\.com/",
	},
	// 同人ショップ
	{
		code: "melonbooks",
		name: "メロンブックス",
		category: "shop",
		urlPattern: "^https?://(www\\.)?melonbooks\\.co\\.jp/",
	},
	{
		code: "toranoana",
		name: "とらのあな",
		category: "shop",
		urlPattern: "^https?://ec\\.toranoana\\.(jp|shop)/",
	},
	{
		code: "akibaoo",
		name: "あきばお～こく",
		category: "shop",
		urlPattern: "^https?://(www\\.)?akibaoo\\.co\\.jp/",
	},
	{
		code: "alice_books",
		name: "アリスブックス",
		category: "shop",
		urlPattern: "^https?://(www\\.)?alice-books\\.com/",
	},
	{
		code: "comic_zin",
		name: "コミックZIN",
		category: "shop",
		urlPattern: "^https?://shop\\.comiczin\\.jp/",
	},
	{
		code: "grep",
		name: "グレップ",
		category: "shop",
		urlPattern: "^https?://(www\\.)?grep\\.jp/",
	},
	{
		code: "surugaya",
		name: "駿河屋",
		category: "shop",
		urlPattern: "^https?://(www\\.)?suruga-ya\\.jp/",
	},
	{
		code: "animate",
		name: "アニメイト",
		category: "shop",
		urlPattern: "^https?://(www\\.)?animate-onlineshop\\.jp/",
	},
	{
		code: "d_stage",
		name: "D-STAGE",
		category: "shop",
		urlPattern: "^https?://(www\\.)?d-stage\\.com/",
	},
	// その他
	{
		code: "web_site",
		name: "Webサイト",
		category: "other",
		urlPattern: "^https?://",
	},
	{
		code: "blog",
		name: "ブログ",
		category: "other",
		urlPattern: "^https?://",
	},
];

const aliasTypesData = [
	{
		code: "main",
		label: "本名義",
		description: "アーティストの本来の名前（メイン名義）",
	},
	{
		code: "romanization",
		label: "ローマ字表記",
		description: "アーティスト名のローマ字表記",
	},
	{
		code: "pseudonym",
		label: "別名義",
		description: "アーティストが使用する別の名前",
	},
];

const creditRolesData = [
	{
		code: "composer",
		label: "作曲",
		description: "楽曲の作曲者",
	},
	{
		code: "arranger",
		label: "編曲",
		description: "楽曲の編曲者",
	},
	{
		code: "lyricist",
		label: "作詞",
		description: "楽曲の作詞者",
	},
	{
		code: "vocalist",
		label: "ボーカル",
		description: "楽曲のボーカル担当",
	},
	{
		code: "remixer",
		label: "リミックス",
		description: "楽曲のリミックス担当",
	},
	{
		code: "illustrator",
		label: "イラスト",
		description: "ジャケットやブックレットのイラスト担当",
	},
];

const officialWorkCategoriesData = [
	{
		code: "pc98",
		name: "PC-98作品",
		description: "PC-98シリーズで発売された作品",
	},
	{
		code: "windows",
		name: "Windows作品",
		description: "Windows向けに発売された作品",
	},
	{
		code: "zun_collection",
		name: "ZUN's Music Collection",
		description: "ZUNの音楽CD作品集",
	},
	{
		code: "akyus_untouched_score",
		name: "幺樂団の歴史",
		description: "東方旧作のサウンドトラック",
	},
	{
		code: "commercial_book",
		name: "商業書籍",
		description: "書籍として発売された作品",
	},
	{
		code: "tasofro",
		name: "黄昏フロンティア作品",
		description: "黄昏フロンティアとの共同制作作品",
	},
	{
		code: "other",
		name: "その他",
		description: "その他の公式作品",
	},
];

async function seed() {
	console.log("Seeding master data...");

	// Upsert platforms
	console.log("Seeding platforms...");
	for (let i = 0; i < platformsData.length; i++) {
		const data = platformsData[i];
		await db
			.insert(platforms)
			.values({ ...data, sortOrder: i })
			.onConflictDoUpdate({
				target: platforms.code,
				set: {
					name: data.name,
					category: data.category,
					urlPattern: data.urlPattern,
					sortOrder: i,
				},
			});
	}
	console.log(`  ✓ ${platformsData.length} platforms seeded`);

	// Upsert alias_types
	console.log("Seeding alias_types...");
	for (let i = 0; i < aliasTypesData.length; i++) {
		const data = aliasTypesData[i];
		await db
			.insert(aliasTypes)
			.values({ ...data, sortOrder: i })
			.onConflictDoUpdate({
				target: aliasTypes.code,
				set: {
					label: data.label,
					description: data.description,
					sortOrder: i,
				},
			});
	}
	console.log(`  ✓ ${aliasTypesData.length} alias types seeded`);

	// Upsert credit_roles
	console.log("Seeding credit_roles...");
	for (let i = 0; i < creditRolesData.length; i++) {
		const data = creditRolesData[i];
		await db
			.insert(creditRoles)
			.values({ ...data, sortOrder: i })
			.onConflictDoUpdate({
				target: creditRoles.code,
				set: {
					label: data.label,
					description: data.description,
					sortOrder: i,
				},
			});
	}
	console.log(`  ✓ ${creditRolesData.length} credit roles seeded`);

	// Upsert official_work_categories
	console.log("Seeding official_work_categories...");
	for (let i = 0; i < officialWorkCategoriesData.length; i++) {
		const data = officialWorkCategoriesData[i];
		await db
			.insert(officialWorkCategories)
			.values({ ...data, sortOrder: i })
			.onConflictDoUpdate({
				target: officialWorkCategories.code,
				set: {
					name: data.name,
					description: data.description,
					sortOrder: i,
				},
			});
	}
	console.log(
		`  ✓ ${officialWorkCategoriesData.length} official work categories seeded`,
	);

	console.log("✓ Master data seeding completed!");
}

seed()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("Error seeding master data:", error);
		process.exit(1);
	});
