/**
 * レガシーCSVインポートAPIエンドポイント
 */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import {
	checkNewEventsNeeded,
	executeLegacyImport,
	getExistingEventsWithMultipleDays,
	type ImportInput,
	type ImportProgress,
} from "../../../services/legacy-import-service";
import { createDbSongMatcher } from "../../../services/song-matcher-service";
import { parseLegacyCSV } from "../../../utils/legacy-csv-parser";
import { parseEventEdition } from "../../../utils/name-utils";

// ファイルサイズ上限: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 新規イベント入力スキーマ
const newEventInputSchema = z.object({
	name: z.string(),
	totalDays: z.number().int().min(1),
	startDate: z.string(),
	endDate: z.string(),
	eventDates: z.array(z.string()),
});

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
	newEvents: z.array(newEventInputSchema).optional(),
	eventDayMappings: z.record(z.string(), z.string()).optional(), // イベント名 -> イベント日ID
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
					error: ERROR_MESSAGES.FILE_NOT_UPLOADED,
				},
				400,
			);
		}

		// ファイル形式チェック
		if (!file.name.endsWith(".csv")) {
			return c.json(
				{
					success: false,
					error: ERROR_MESSAGES.ONLY_CSV_ALLOWED,
				},
				400,
			);
		}

		// ファイルサイズチェック
		if (file.size > MAX_FILE_SIZE) {
			return c.json(
				{
					success: false,
					error: ERROR_MESSAGES.FILE_SIZE_EXCEEDED(MAX_FILE_SIZE / 1024 / 1024),
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
				newEventsNeeded: [],
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

		// ユニークなイベント名を抽出
		const uniqueEventNames = [
			...new Set(parseResult.records.map((r) => r.event)),
		].filter((name) => name.trim() !== "");

		// 新規イベントが必要かチェック
		const newEventsNeeded = await checkNewEventsNeeded(uniqueEventNames);

		// 新規イベントの回次を推測
		const newEventsWithEdition = newEventsNeeded.map((eventName) => {
			const editionInfo = parseEventEdition(eventName);
			return {
				name: eventName,
				baseName: editionInfo.baseName,
				edition: editionInfo.edition,
			};
		});

		// 複数日を持つ既存イベントを取得
		const existingEventsWithDays =
			await getExistingEventsWithMultipleDays(uniqueEventNames);

		return c.json({
			success: true,
			records: parseResult.records,
			songMatches,
			newEventsNeeded: newEventsWithEdition,
			existingEventsWithDays,
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
						: ERROR_MESSAGES.UNEXPECTED_ERROR,
			},
			500,
		);
	}
});

/**
 * 実行エンドポイント（SSEストリーミング）
 * POST /api/admin/import/legacy/execute
 *
 * パースされたレコードと原曲マッピングを受け取ってデータ登録を実行
 * Server-Sent Events で進捗をリアルタイム通知
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
					error: ERROR_MESSAGES.INVALID_REQUEST_DATA,
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
		const eventDayMappings = parsed.data.eventDayMappings
			? new Map<string, string>(Object.entries(parsed.data.eventDayMappings))
			: undefined;

		// インポート実行
		const input: ImportInput = {
			records: parsed.data.records,
			songMappings,
			customSongNames,
			newEvents: parsed.data.newEvents,
			eventDayMappings,
		};

		// SSEでストリーミングレスポンス
		return streamSSE(c, async (stream) => {
			let eventId = 0;

			// 進捗コールバック
			const onProgress = async (progress: ImportProgress) => {
				await stream.writeSSE({
					id: String(eventId++),
					event: "progress",
					data: JSON.stringify(progress),
				});
			};

			try {
				// インポート実行（進捗コールバック付き）
				const result = await executeLegacyImport(input, onProgress);

				// 最終結果を送信
				await stream.writeSSE({
					id: String(eventId++),
					event: "result",
					data: JSON.stringify(result),
				});
			} catch (error) {
				// エラーを送信
				await stream.writeSSE({
					id: String(eventId++),
					event: "error",
					data: JSON.stringify({
						success: false,
						error:
							error instanceof Error
								? error.message
								: "予期しないエラーが発生しました",
					}),
				});
			}
		});
	} catch (error) {
		console.error("Execute error:", error);
		return c.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: ERROR_MESSAGES.UNEXPECTED_ERROR,
			},
			500,
		);
	}
});

export { legacyImportRouter };
