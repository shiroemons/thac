import {
	and,
	asc,
	db,
	eq,
	inArray,
	like,
	or,
	trackCreditRoles,
	trackCredits,
	trackIsrcs,
	trackOfficialSongs,
	trackPublications,
	tracks,
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

const trackExportRouter = new Hono<AdminContext>();

// トラックカラム定義
const trackColumns: ColumnDefinition<{
	id: string;
	releaseId: string | null;
	discId: string | null;
	trackNumber: number;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	eventId: string | null;
	eventDayId: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "releaseId", label: "releaseId" },
	{ key: "discId", label: "discId" },
	{ key: "trackNumber", label: "trackNumber" },
	{ key: "name", label: "name" },
	{ key: "nameJa", label: "nameJa" },
	{ key: "nameEn", label: "nameEn" },
	{ key: "releaseDate", label: "releaseDate" },
	{ key: "releaseYear", label: "releaseYear" },
	{ key: "releaseMonth", label: "releaseMonth" },
	{ key: "releaseDay", label: "releaseDay" },
	{ key: "eventId", label: "eventId" },
	{ key: "eventDayId", label: "eventDayId" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// トラックエクスポート
trackExportRouter.get("/", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const releaseId = c.req.query("releaseId");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (releaseId) {
			conditions.push(eq(tracks.releaseId, releaseId));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(tracks.name, searchPattern),
					like(tracks.nameJa, searchPattern),
					like(tracks.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(tracks)
			.where(whereCondition)
			.orderBy(
				asc(tracks.releaseId),
				asc(tracks.discId),
				asc(tracks.trackNumber),
			);

		// 関連データ取得
		const creditsMap = new Map<
			string,
			(typeof trackCredits.$inferSelect & {
				roles: (typeof trackCreditRoles.$inferSelect)[];
			})[]
		>();
		const officialSongsMap = new Map<
			string,
			(typeof trackOfficialSongs.$inferSelect)[]
		>();
		const publicationsMap = new Map<
			string,
			(typeof trackPublications.$inferSelect)[]
		>();
		const isrcsMap = new Map<string, (typeof trackIsrcs.$inferSelect)[]>();

		if (includeRelations && data.length > 0) {
			const ids = data.map((t) => t.id);

			// クレジット取得
			const creditsData = await db
				.select()
				.from(trackCredits)
				.where(inArray(trackCredits.trackId, ids));

			const creditIds = creditsData.map((c) => c.id);

			// クレジットロール取得
			const rolesMap = new Map<
				string,
				(typeof trackCreditRoles.$inferSelect)[]
			>();
			if (creditIds.length > 0) {
				const rolesData = await db
					.select()
					.from(trackCreditRoles)
					.where(inArray(trackCreditRoles.trackCreditId, creditIds));

				for (const role of rolesData) {
					const existing = rolesMap.get(role.trackCreditId) || [];
					existing.push(role);
					rolesMap.set(role.trackCreditId, existing);
				}
			}

			// クレジットにロールをマージ
			for (const credit of creditsData) {
				const existing = creditsMap.get(credit.trackId) || [];
				existing.push({
					...credit,
					roles: rolesMap.get(credit.id) || [],
				});
				creditsMap.set(credit.trackId, existing);
			}

			// 公式楽曲リンク取得
			const officialSongsData = await db
				.select()
				.from(trackOfficialSongs)
				.where(inArray(trackOfficialSongs.trackId, ids));

			for (const song of officialSongsData) {
				const existing = officialSongsMap.get(song.trackId) || [];
				existing.push(song);
				officialSongsMap.set(song.trackId, existing);
			}

			// 外部リンク取得
			const publicationsData = await db
				.select()
				.from(trackPublications)
				.where(inArray(trackPublications.trackId, ids));

			for (const pub of publicationsData) {
				const existing = publicationsMap.get(pub.trackId) || [];
				existing.push(pub);
				publicationsMap.set(pub.trackId, existing);
			}

			// ISRC取得
			const isrcsData = await db
				.select()
				.from(trackIsrcs)
				.where(inArray(trackIsrcs.trackId, ids));

			for (const isrc of isrcsData) {
				const existing = isrcsMap.get(isrc.trackId) || [];
				existing.push(isrc);
				isrcsMap.set(isrc.trackId, existing);
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((t) => ({
				...t,
				...(includeRelations && {
					credits: JSON.stringify(
						creditsMap.get(t.id)?.map((c) => ({
							creditName: c.creditName,
							artistId: c.artistId,
							roles: c.roles.map((r) => r.roleCode),
						})) || [],
					),
					officialSongs: JSON.stringify(
						officialSongsMap.get(t.id)?.map((s) => ({
							officialSongId: s.officialSongId,
							customSongName: s.customSongName,
						})) || [],
					),
					publications: JSON.stringify(
						publicationsMap.get(t.id)?.map((p) => ({
							platform: p.platformCode,
							url: p.url,
						})) || [],
					),
					isrcs: JSON.stringify(isrcsMap.get(t.id)?.map((i) => i.isrc) || []),
				}),
			}));

			const columns = includeRelations
				? [
						...trackColumns,
						{ key: "credits" as const, label: "credits" },
						{ key: "officialSongs" as const, label: "officialSongs" },
						{ key: "publications" as const, label: "publications" },
						{ key: "isrcs" as const, label: "isrcs" },
					]
				: trackColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("トラック", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((t) => ({
			...t,
			...(includeRelations && {
				credits: creditsMap.get(t.id) || [],
				officialSongs: officialSongsMap.get(t.id) || [],
				publications: publicationsMap.get(t.id) || [],
				isrcs: isrcsMap.get(t.id) || [],
			}),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("トラック", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/tracks");
	}
});

export { trackExportRouter };
