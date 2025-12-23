/**
 * レガシーCSVインポートAPIエンドポイント
 */
import { Hono } from "hono";
import { z } from "zod";
import type { AdminContext } from "../../../middleware/admin-auth";
import {
	executeLegacyImport,
	type ImportInput,
} from "../../../services/legacy-import-service";
import { createDbSongMatcher } from "../../../services/song-matcher-service";
import { parseLegacyCSV } from "../../../utils/legacy-csv-parser";

// ファイルサイズ上限: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 実行リクエスト型
const executeRequestSchema = z.object({
	records: z.array(
		z.object({
			circle: z.string(),
			album: z.string(),
			title: z.string(),
			trackNumber: z.number(),
			event: z.string(),
			vocalists: z.array(z.string()),
			arrangers: z.array(z.string()),
			lyricists: z.array(z.string()),
			originalSongs: z.array(z.string()),
		}),
	),
	songMappings: z.record(z.string(), z.string()),
	customSongNames: z.record(z.string(), z.string()),
});

const legacyImportRouter = new Hono<AdminContext>();

/**
 * プレビューエンドポイント
 * POST /api/admin/import/legacy/preview
 *
 * CSVファイルをアップロードしてパース結果と原曲マッチング候補を返却
 */
legacyImportRouter.post("/preview", async (c) => {
	try {
		// マルチパートフォームデータからファイルを取得
		const formData = await c.req.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) {
			return c.json(
				{
					success: false,
					error: "ファイルがアップロードされていません",
				},
				400,
			);
		}

		// ファイル形式チェック
		if (!file.name.endsWith(".csv")) {
			return c.json(
				{
					success: false,
					error: "CSVファイルのみアップロード可能です",
				},
				400,
			);
		}

		// ファイルサイズチェック
		if (file.size > MAX_FILE_SIZE) {
			return c.json(
				{
					success: false,
					error: `ファイルサイズが${MAX_FILE_SIZE / 1024 / 1024}MBを超えています`,
				},
				400,
			);
		}

		// CSVコンテンツを読み込み
		const csvContent = await file.text();

		// CSVをパース
		const parseResult = parseLegacyCSV(csvContent);

		if (!parseResult.success) {
			return c.json({
				success: false,
				records: [],
				songMatches: [],
				errors: parseResult.errors,
			});
		}

		// ユニークな原曲名を抽出
		const uniqueOriginalNames = [
			...new Set(parseResult.records.flatMap((r) => r.originalSongs)),
		].filter((name) => name.trim() !== "");

		// 原曲マッチング
		const matcher = createDbSongMatcher(10);
		const songMatches = await matcher.matchSongs(uniqueOriginalNames);

		return c.json({
			success: true,
			records: parseResult.records,
			songMatches,
			errors: [],
		});
	} catch (error) {
		console.error("Preview error:", error);
		return c.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "予期しないエラーが発生しました",
			},
			500,
		);
	}
});

/**
 * 実行エンドポイント
 * POST /api/admin/import/legacy/execute
 *
 * パースされたレコードと原曲マッピングを受け取ってデータ登録を実行
 */
legacyImportRouter.post("/execute", async (c) => {
	try {
		const body = await c.req.json();

		// リクエストバリデーション
		const parsed = executeRequestSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: "リクエストデータが不正です",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// Mapに変換
		const songMappings = new Map<string, string>(
			Object.entries(parsed.data.songMappings),
		);
		const customSongNames = new Map<string, string>(
			Object.entries(parsed.data.customSongNames),
		);

		// インポート実行
		const input: ImportInput = {
			records: parsed.data.records,
			songMappings,
			customSongNames,
		};

		const result = await executeLegacyImport(input);

		return c.json(result);
	} catch (error) {
		console.error("Execute error:", error);
		return c.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "予期しないエラーが発生しました",
			},
			500,
		);
	}
});

export { legacyImportRouter };
