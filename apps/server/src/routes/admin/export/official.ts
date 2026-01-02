import {
	and,
	asc,
	db,
	eq,
	inArray,
	like,
	officialSongLinks,
	officialSongs,
	officialWorkLinks,
	officialWorks,
	or,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import {
	type ColumnDefinition,
	createExportResponse,
	formatToJSON,
	formatToTSV,
	generateFilename,
} from "../../../utils/export-formatter";

const officialExportRouter = new Hono<AdminContext>();

// 公式作品カラム定義
const workColumns: ColumnDefinition<{
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	numberInSeries: number | null;
	releaseDate: string | null;
	officialOrganization: string | null;
	position: number | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "categoryCode", label: "categoryCode" },
	{ key: "name", label: "name" },
	{ key: "nameJa", label: "nameJa" },
	{ key: "nameEn", label: "nameEn" },
	{ key: "shortNameJa", label: "shortNameJa" },
	{ key: "shortNameEn", label: "shortNameEn" },
	{ key: "numberInSeries", label: "numberInSeries" },
	{ key: "releaseDate", label: "releaseDate" },
	{ key: "officialOrganization", label: "officialOrganization" },
	{ key: "position", label: "position" },
	{ key: "notes", label: "notes" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// 公式楽曲カラム定義
const songColumns: ColumnDefinition<{
	id: string;
	officialWorkId: string | null;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	sourceSongId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "officialWorkId", label: "officialWorkId" },
	{ key: "trackNumber", label: "trackNumber" },
	{ key: "name", label: "name" },
	{ key: "nameJa", label: "nameJa" },
	{ key: "nameEn", label: "nameEn" },
	{ key: "composerName", label: "composerName" },
	{ key: "arrangerName", label: "arrangerName" },
	{ key: "isOriginal", label: "isOriginal" },
	{ key: "sourceSongId", label: "sourceSongId" },
	{ key: "notes", label: "notes" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// 公式作品エクスポート
officialExportRouter.get("/works", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const categoryCode = c.req.query("categoryCode");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (categoryCode) {
			conditions.push(eq(officialWorks.categoryCode, categoryCode));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(officialWorks.name, searchPattern),
					like(officialWorks.nameJa, searchPattern),
					like(officialWorks.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(officialWorks)
			.where(whereCondition)
			.orderBy(asc(officialWorks.position));

		// 関連データ取得
		const linksMap = new Map<
			string,
			(typeof officialWorkLinks.$inferSelect)[]
		>();
		const songsMap = new Map<string, (typeof officialSongs.$inferSelect)[]>();

		if (includeRelations && data.length > 0) {
			const ids = data.map((w) => w.id);

			// リンク取得
			const linksData = await db
				.select()
				.from(officialWorkLinks)
				.where(inArray(officialWorkLinks.officialWorkId, ids))
				.orderBy(asc(officialWorkLinks.sortOrder));

			for (const link of linksData) {
				const existing = linksMap.get(link.officialWorkId) || [];
				existing.push(link);
				linksMap.set(link.officialWorkId, existing);
			}

			// 楽曲取得
			const songsData = await db
				.select()
				.from(officialSongs)
				.where(inArray(officialSongs.officialWorkId, ids))
				.orderBy(asc(officialSongs.trackNumber));

			for (const song of songsData) {
				if (song.officialWorkId) {
					const existing = songsMap.get(song.officialWorkId) || [];
					existing.push(song);
					songsMap.set(song.officialWorkId, existing);
				}
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((w) => ({
				...w,
				...(includeRelations && {
					links: JSON.stringify(
						linksMap.get(w.id)?.map((l) => ({
							platform: l.platformCode,
							url: l.url,
						})) || [],
					),
					songs: JSON.stringify(
						songsMap.get(w.id)?.map((s) => ({
							trackNumber: s.trackNumber,
							name: s.name,
						})) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [
						...workColumns,
						{ key: "links" as const, label: "links" },
						{ key: "songs" as const, label: "songs" },
					]
				: workColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("official-works", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((w) => ({
			...w,
			...(includeRelations && {
				links: linksMap.get(w.id) || [],
				songs: songsMap.get(w.id) || [],
			}),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("official-works", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/official/works");
	}
});

// 公式楽曲エクスポート
officialExportRouter.get("/songs", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const workId = c.req.query("workId");
		const isOriginal = c.req.query("isOriginal");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (workId) {
			conditions.push(eq(officialSongs.officialWorkId, workId));
		}

		if (isOriginal !== undefined) {
			conditions.push(eq(officialSongs.isOriginal, isOriginal === "true"));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(officialSongs.name, searchPattern),
					like(officialSongs.nameJa, searchPattern),
					like(officialSongs.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(officialSongs)
			.where(whereCondition)
			.orderBy(
				asc(officialSongs.officialWorkId),
				asc(officialSongs.trackNumber),
			);

		// 関連データ取得
		const linksMap = new Map<
			string,
			(typeof officialSongLinks.$inferSelect)[]
		>();

		if (includeRelations && data.length > 0) {
			const ids = data.map((s) => s.id);

			// リンク取得
			const linksData = await db
				.select()
				.from(officialSongLinks)
				.where(inArray(officialSongLinks.officialSongId, ids))
				.orderBy(asc(officialSongLinks.sortOrder));

			for (const link of linksData) {
				const existing = linksMap.get(link.officialSongId) || [];
				existing.push(link);
				linksMap.set(link.officialSongId, existing);
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((s) => ({
				...s,
				...(includeRelations && {
					links: JSON.stringify(
						linksMap.get(s.id)?.map((l) => ({
							platform: l.platformCode,
							url: l.url,
						})) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [...songColumns, { key: "links" as const, label: "links" }]
				: songColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("official-songs", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((s) => ({
			...s,
			...(includeRelations && { links: linksMap.get(s.id) || [] }),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("official-songs", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/official/songs");
	}
});

export { officialExportRouter };
