import {
	and,
	artistAliases,
	artists,
	asc,
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

const artistExportRouter = new Hono<AdminContext>();

// アーティストカラム定義
const artistColumns: ColumnDefinition<{
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

// アーティストエクスポート
artistExportRouter.get("/", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const initialScript = c.req.query("initialScript");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (initialScript) {
			conditions.push(eq(artists.initialScript, initialScript));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(artists.name, searchPattern),
					like(artists.nameJa, searchPattern),
					like(artists.nameEn, searchPattern),
					like(artists.sortName, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(artists)
			.where(whereCondition)
			.orderBy(asc(artists.name));

		// 関連データ取得
		const aliasesMap = new Map<string, (typeof artistAliases.$inferSelect)[]>();
		if (includeRelations && data.length > 0) {
			const ids = data.map((a) => a.id);
			const aliases = await db
				.select()
				.from(artistAliases)
				.where(inArray(artistAliases.artistId, ids))
				.orderBy(asc(artistAliases.name));

			for (const alias of aliases) {
				const existing = aliasesMap.get(alias.artistId) || [];
				existing.push(alias);
				aliasesMap.set(alias.artistId, existing);
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((a) => ({
				...a,
				...(includeRelations && {
					aliases: JSON.stringify(
						aliasesMap.get(a.id)?.map((alias) => alias.name) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [...artistColumns, { key: "aliases" as const, label: "aliases" }]
				: artistColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("アーティスト", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((a) => ({
			...a,
			...(includeRelations && { aliases: aliasesMap.get(a.id) || [] }),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("アーティスト", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/artists");
	}
});

export { artistExportRouter };
