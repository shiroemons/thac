import {
	and,
	asc,
	circleLinks,
	circles,
	db,
	eq,
	inArray,
	like,
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

const circleExportRouter = new Hono<AdminContext>();

// サークルカラム定義
const circleColumns: ColumnDefinition<{
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "name", label: "name" },
	{ key: "nameJa", label: "nameJa" },
	{ key: "nameEn", label: "nameEn" },
	{ key: "sortName", label: "sortName" },
	{ key: "nameInitial", label: "nameInitial" },
	{ key: "initialScript", label: "initialScript" },
	{ key: "notes", label: "notes" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// サークルエクスポート
circleExportRouter.get("/", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const initialScript = c.req.query("initialScript");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (initialScript) {
			conditions.push(eq(circles.initialScript, initialScript));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(circles.name, searchPattern),
					like(circles.nameJa, searchPattern),
					like(circles.nameEn, searchPattern),
					like(circles.sortName, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(circles)
			.where(whereCondition)
			.orderBy(asc(circles.name));

		// 関連データ取得
		const linksMap = new Map<string, (typeof circleLinks.$inferSelect)[]>();
		if (includeRelations && data.length > 0) {
			const ids = data.map((c) => c.id);
			const links = await db
				.select()
				.from(circleLinks)
				.where(inArray(circleLinks.circleId, ids))
				.orderBy(asc(circleLinks.platformCode));

			for (const link of links) {
				const existing = linksMap.get(link.circleId) || [];
				existing.push(link);
				linksMap.set(link.circleId, existing);
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((c) => ({
				...c,
				...(includeRelations && {
					links: JSON.stringify(
						linksMap.get(c.id)?.map((link) => ({
							platform: link.platformCode,
							url: link.url,
						})) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [...circleColumns, { key: "links" as const, label: "links" }]
				: circleColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("circles", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((c) => ({
			...c,
			...(includeRelations && { links: linksMap.get(c.id) || [] }),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("circles", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/circles");
	}
});

export { circleExportRouter };
