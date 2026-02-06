import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { genres } from "./schema/genre";
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

const client = postgres(
	process.env.DATABASE_URL || "postgresql://localhost:5432/thac",
);

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
		code: "zuns_music_collection",
		name: "ZUN's Music Collection",
		description: "ZUNの音楽CD作品集",
	},
	{
		code: "akyus_untouched_score",
		name: "幺樂団の歴史",
		description: "東方旧作のサウンドトラック",
	},
	{
		code: "commercial_books",
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

const genresData = [
	// ポピュラー音楽 - 暖色系で区別
	{
		code: "pop",
		nameJa: "ポップ",
		nameEn: "Pop",
		color: "#EC4899", // ピンク500（fuchsia-pinkより鮮やか）
		icon: "heart",
	},
	{
		code: "rock",
		nameJa: "ロック",
		nameEn: "Rock",
		color: "#DC2626", // 赤600
		icon: "guitar",
	},
	{
		code: "hip_hop",
		nameJa: "ヒップホップ",
		nameEn: "Hip-Hop",
		color: "#F59E0B", // アンバー500
		icon: "mic",
	},
	{
		code: "rnb",
		nameJa: "R&B",
		nameEn: "R&B",
		color: "#A855F7", // パープル500
		icon: "heart-pulse",
	},
	{
		code: "country",
		nameJa: "カントリー",
		nameEn: "Country",
		color: "#D97706", // アンバー600（茶色寄り）
		icon: "mountain",
	},
	// 電子音楽 - 寒色系で区別
	{
		code: "electronic",
		nameJa: "エレクトロニック",
		nameEn: "Electronic",
		color: "#06B6D4", // シアン500
		icon: "zap",
	},
	{
		code: "house",
		nameJa: "ハウス",
		nameEn: "House",
		color: "#3B82F6", // ブルー500（より青く）
		icon: "home",
	},
	{
		code: "techno",
		nameJa: "テクノ",
		nameEn: "Techno",
		color: "#1D4ED8", // ブルー700（より濃い青）
		icon: "cpu",
	},
	{
		code: "trance",
		nameJa: "トランス",
		nameEn: "Trance",
		color: "#8B5CF6", // バイオレット500
		icon: "sparkles",
	},
	// クラシック・ジャズ - アース/ニュートラル
	{
		code: "classical",
		nameJa: "クラシック",
		nameEn: "Classical",
		color: "#92400E", // アンバー800（より濃い茶）
		icon: "music-2",
	},
	{
		code: "orchestral",
		nameJa: "オーケストラ",
		nameEn: "Orchestral",
		color: "#7C2D12", // オレンジ900（深い赤茶）
		icon: "users",
	},
	{
		code: "jazz",
		nameJa: "ジャズ",
		nameEn: "Jazz",
		color: "#B45309", // アンバー700
		icon: "music",
	},
	{
		code: "blues",
		nameJa: "ブルース",
		nameEn: "Blues",
		color: "#1E40AF", // ブルー800
		icon: "sunset",
	},
	// メタル・パンク - ダーク系
	{
		code: "metal",
		nameJa: "メタル",
		nameEn: "Metal",
		color: "#18181B", // ジンク900（ほぼ黒）
		icon: "skull",
	},
	{
		code: "punk",
		nameJa: "パンク",
		nameEn: "Punk",
		color: "#EA580C", // オレンジ600（Latinと区別）
		icon: "flame",
	},
	// ワールド・フォーク
	{
		code: "folk",
		nameJa: "フォーク",
		nameEn: "Folk",
		color: "#65A30D", // ライム600（緑系）
		icon: "leaf",
	},
	{
		code: "latin",
		nameJa: "ラテン",
		nameEn: "Latin",
		color: "#E11D48", // ローズ600（赤ピンク）
		icon: "sun",
	},
	{
		code: "reggae",
		nameJa: "レゲエ",
		nameEn: "Reggae",
		color: "#16A34A", // グリーン600
		icon: "palmtree",
	},
	// 日本音楽
	{
		code: "jpop",
		nameJa: "J-POP",
		nameEn: "J-Pop",
		color: "#DB2777", // ピンク600（Popと区別）
		icon: "sparkles",
	},
	{
		code: "jrock",
		nameJa: "J-ROCK",
		nameEn: "J-Rock",
		color: "#BE123C", // ローズ700
		icon: "guitar",
	},
	{
		code: "enka",
		nameJa: "演歌",
		nameEn: "Enka",
		color: "#881337", // ローズ900（深い赤紫）
		icon: "mic-2",
	},
	{
		code: "city_pop",
		nameJa: "シティポップ",
		nameEn: "City Pop",
		color: "#FB923C", // オレンジ400
		icon: "building",
	},
	// アニメ・ゲーム・同人
	{
		code: "anime",
		nameJa: "アニソン",
		nameEn: "Anime",
		color: "#F97316", // オレンジ500
		icon: "tv",
	},
	{
		code: "game",
		nameJa: "ゲーム音楽",
		nameEn: "Game",
		color: "#7C3AED", // バイオレット600
		icon: "gamepad-2",
	},
	{
		code: "vocaloid",
		nameJa: "ボーカロイド",
		nameEn: "Vocaloid",
		color: "#14B8A6", // ティール500
		icon: "bot",
	},
];

async function seed() {
	console.log("Seeding master data...");

	// Upsert platforms
	console.log("Seeding platforms...");
	for (let i = 0; i < platformsData.length; i++) {
		const data = platformsData[i];
		if (!data) continue;
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
		if (!data) continue;
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
		if (!data) continue;
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
		if (!data) continue;
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

	// Upsert genres
	console.log("Seeding genres...");
	for (let i = 0; i < genresData.length; i++) {
		const data = genresData[i];
		if (!data) continue;
		await db
			.insert(genres)
			.values({ ...data, sortOrder: i })
			.onConflictDoUpdate({
				target: genres.code,
				set: {
					nameJa: data.nameJa,
					nameEn: data.nameEn,
					color: data.color,
					icon: data.icon,
					sortOrder: i,
				},
			});
	}
	console.log(`  ✓ ${genresData.length} genres seeded`);

	console.log("✓ Master data seeding completed!");
}

seed()
	.then(async () => {
		await client.end();
		process.exit(0);
	})
	.catch((error) => {
		console.error("Error seeding master data:", error);
		process.exit(1);
	});
