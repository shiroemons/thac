import {
	and,
	asc,
	db,
	discs,
	eq,
	inArray,
	like,
	or,
	releaseCircles,
	releaseJanCodes,
	releasePublications,
	releases,
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

const releaseExportRouter = new Hono<AdminContext>();

// リリースカラム定義
const releaseColumns: ColumnDefinition<{
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	releaseType: string | null;
	eventId: string | null;
	eventDayId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "name", label: "name" },
	{ key: "nameJa", label: "nameJa" },
	{ key: "nameEn", label: "nameEn" },
	{ key: "releaseDate", label: "releaseDate" },
	{ key: "releaseYear", label: "releaseYear" },
	{ key: "releaseMonth", label: "releaseMonth" },
	{ key: "releaseDay", label: "releaseDay" },
	{ key: "releaseType", label: "releaseType" },
	{ key: "eventId", label: "eventId" },
	{ key: "eventDayId", label: "eventDayId" },
	{ key: "notes", label: "notes" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// リリースエクスポート
releaseExportRouter.get("/", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const releaseType = c.req.query("releaseType");
		const eventId = c.req.query("eventId");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (releaseType) {
			conditions.push(eq(releases.releaseType, releaseType));
		}

		if (eventId) {
			conditions.push(eq(releases.eventId, eventId));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(releases.name, searchPattern),
					like(releases.nameJa, searchPattern),
					like(releases.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(releases)
			.where(whereCondition)
			.orderBy(asc(releases.releaseDate));

		// 関連データ取得
		const circlesMap = new Map<
			string,
			(typeof releaseCircles.$inferSelect)[]
		>();
		const discsMap = new Map<string, (typeof discs.$inferSelect)[]>();
		const publicationsMap = new Map<
			string,
			(typeof releasePublications.$inferSelect)[]
		>();
		const janCodesMap = new Map<
			string,
			(typeof releaseJanCodes.$inferSelect)[]
		>();

		if (includeRelations && data.length > 0) {
			const ids = data.map((r) => r.id);

			// 参加サークル取得
			const circlesData = await db
				.select()
				.from(releaseCircles)
				.where(inArray(releaseCircles.releaseId, ids));

			for (const circle of circlesData) {
				const existing = circlesMap.get(circle.releaseId) || [];
				existing.push(circle);
				circlesMap.set(circle.releaseId, existing);
			}

			// ディスク取得
			const discsData = await db
				.select()
				.from(discs)
				.where(inArray(discs.releaseId, ids))
				.orderBy(asc(discs.discNumber));

			for (const disc of discsData) {
				const existing = discsMap.get(disc.releaseId) || [];
				existing.push(disc);
				discsMap.set(disc.releaseId, existing);
			}

			// 外部リンク取得
			const publicationsData = await db
				.select()
				.from(releasePublications)
				.where(inArray(releasePublications.releaseId, ids));

			for (const pub of publicationsData) {
				const existing = publicationsMap.get(pub.releaseId) || [];
				existing.push(pub);
				publicationsMap.set(pub.releaseId, existing);
			}

			// JANコード取得
			const janCodesData = await db
				.select()
				.from(releaseJanCodes)
				.where(inArray(releaseJanCodes.releaseId, ids));

			for (const jan of janCodesData) {
				const existing = janCodesMap.get(jan.releaseId) || [];
				existing.push(jan);
				janCodesMap.set(jan.releaseId, existing);
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((r) => ({
				...r,
				...(includeRelations && {
					circles: JSON.stringify(
						circlesMap.get(r.id)?.map((c) => ({
							circleId: c.circleId,
							participationType: c.participationType,
						})) || [],
					),
					discs: JSON.stringify(
						discsMap.get(r.id)?.map((d) => ({
							discNumber: d.discNumber,
							discName: d.discName,
						})) || [],
					),
					publications: JSON.stringify(
						publicationsMap.get(r.id)?.map((p) => ({
							platform: p.platformCode,
							url: p.url,
						})) || [],
					),
					janCodes: JSON.stringify(
						janCodesMap.get(r.id)?.map((j) => j.janCode) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [
						...releaseColumns,
						{ key: "circles" as const, label: "circles" },
						{ key: "discs" as const, label: "discs" },
						{ key: "publications" as const, label: "publications" },
						{ key: "janCodes" as const, label: "janCodes" },
					]
				: releaseColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("releases", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((r) => ({
			...r,
			...(includeRelations && {
				circles: circlesMap.get(r.id) || [],
				discs: discsMap.get(r.id) || [],
				publications: publicationsMap.get(r.id) || [],
				janCodes: janCodesMap.get(r.id) || [],
			}),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("releases", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/releases");
	}
});

export { releaseExportRouter };
