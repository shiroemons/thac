/**
 * レガシーCSVインポートサービス
 *
 * パースされたCSVデータをデータベースに登録するサービス。
 * 依存関係順（events → circles → artists → releases → discs → tracks → credits）で処理する。
 */

import {
	artistAliases,
	artists,
	circles,
	createId,
	db,
	discs,
	eq,
	eventDays,
	eventSeries,
	events,
	like,
	releaseCircles,
	releases,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
} from "@thac/db";
import { detectInitial } from "@thac/utils";
import type { LegacyCSVRecord } from "../utils/legacy-csv-parser";
import { splitCircles } from "../utils/legacy-csv-parser";
import {
	generateNameInfo,
	generateSortName,
	normalizeFullWidthSymbols,
	parseDiscInfo,
	parseEventEdition,
} from "../utils/name-utils";

// 「本名義」のエイリアスタイプコード
const MAIN_ALIAS_TYPE_CODE = "main";

export interface ImportInput {
	records: LegacyCSVRecord[];
	songMappings: Map<string, string>; // originalName -> officialSongId
	customSongNames: Map<string, string>; // originalName -> customSongName（マッチしない原曲用）
	newEvents?: NewEventInput[]; // 新規イベント情報
}

export interface NewEventInput {
	name: string;
	totalDays: number;
	startDate: string;
	endDate: string;
	eventDates: string[]; // 各日の日付
}

export interface EntityCount {
	created: number;
	updated: number;
	skipped: number;
}

export interface ImportError {
	row: number;
	entity: string;
	message: string;
}

export interface ImportResult {
	success: boolean;
	events: EntityCount;
	eventDays: EntityCount;
	circles: EntityCount;
	artists: EntityCount;
	artistAliases: EntityCount;
	releases: EntityCount;
	discs: EntityCount;
	tracks: EntityCount;
	credits: EntityCount;
	officialSongLinks: EntityCount;
	errors: ImportError[];
}

// 進捗通知用インターフェース
export type ImportStage =
	| "preparing"
	| "events"
	| "circles"
	| "artists"
	| "releases"
	| "tracks"
	| "credits"
	| "links"
	| "complete";

export interface ImportProgress {
	stage: ImportStage;
	current: number;
	total: number;
	message: string;
	// 全エンティティの進捗情報
	entityProgress?: EntityProgressMap;
}

// 各エンティティタイプの進捗
export interface EntityProgress {
	processed: number;
	total: number;
}

export interface EntityProgressMap {
	events: EntityProgress;
	circles: EntityProgress;
	artists: EntityProgress;
	releases: EntityProgress;
	tracks: EntityProgress;
}

export type ProgressCallback = (progress: ImportProgress) => void;

// レコードから事前にユニークなエンティティ数をカウント
function countUniqueEntities(records: LegacyCSVRecord[]): EntityProgressMap {
	const uniqueEvents = new Set<string>();
	const uniqueCircles = new Set<string>();
	const uniqueArtists = new Set<string>();
	const uniqueReleases = new Set<string>();

	for (const record of records) {
		// イベント
		if (record.event.trim()) {
			uniqueEvents.add(record.event.trim());
		}

		// サークル（複合サークルを分割）
		const circleNames = splitCircles(record.circle);
		for (const name of circleNames) {
			const normalized = normalizeFullWidthSymbols(name.trim());
			if (normalized) {
				uniqueCircles.add(normalized);
			}
		}

		// アーティスト
		const allArtists = [
			...record.vocalists,
			...record.arrangers,
			...record.lyricists,
		];
		for (const name of allArtists) {
			const normalized = normalizeFullWidthSymbols(name.trim());
			if (normalized) {
				uniqueArtists.add(normalized);
			}
		}

		// リリース（サークル名:アルバムベース名）
		const discInfo = parseDiscInfo(record.album);
		const primaryCircle = normalizeFullWidthSymbols(
			circleNames[0]?.trim() || "",
		);
		if (primaryCircle && discInfo.name) {
			uniqueReleases.add(`${primaryCircle}:${discInfo.name}`);
		}
	}

	return {
		events: { processed: 0, total: uniqueEvents.size },
		circles: { processed: 0, total: uniqueCircles.size },
		artists: { processed: 0, total: uniqueArtists.size },
		releases: { processed: 0, total: uniqueReleases.size },
		tracks: { processed: 0, total: records.length },
	};
}

// キャッシュ用のマップ
interface ImportCache {
	events: Map<string, string>; // eventName -> eventId
	circles: Map<string, string>; // circleName -> circleId
	artists: Map<string, string>; // artistName -> artistId
	releases: Map<string, string>; // `${circleName}:${albumBaseName}` -> releaseId
	discs: Map<string, string>; // `${releaseId}:${discNumber}` -> discId
	tracks: Map<string, string>; // `${discId}:${trackNumber}` or `${releaseId}:${trackNumber}` -> trackId
}

// トランザクション型
// biome-ignore lint/suspicious/noExplicitAny: Transaction type is complex
type DbTransaction = any;

/**
 * レガシーCSVデータをインポートする
 * @param input インポート入力データ
 * @param onProgress 進捗コールバック（オプション）
 */
export async function executeLegacyImport(
	input: ImportInput,
	onProgress?: ProgressCallback,
): Promise<ImportResult> {
	const result: ImportResult = {
		success: true,
		events: { created: 0, updated: 0, skipped: 0 },
		eventDays: { created: 0, updated: 0, skipped: 0 },
		circles: { created: 0, updated: 0, skipped: 0 },
		artists: { created: 0, updated: 0, skipped: 0 },
		artistAliases: { created: 0, updated: 0, skipped: 0 },
		releases: { created: 0, updated: 0, skipped: 0 },
		discs: { created: 0, updated: 0, skipped: 0 },
		tracks: { created: 0, updated: 0, skipped: 0 },
		credits: { created: 0, updated: 0, skipped: 0 },
		officialSongLinks: { created: 0, updated: 0, skipped: 0 },
		errors: [],
	};

	const cache: ImportCache = {
		events: new Map(),
		circles: new Map(),
		artists: new Map(),
		releases: new Map(),
		discs: new Map(),
		tracks: new Map(),
	};

	const totalRecords = input.records.length;

	// 事前にユニークなエンティティ数をカウント
	const entityProgress = countUniqueEntities(input.records);

	// 新規イベントも含める
	if (input.newEvents && input.newEvents.length > 0) {
		entityProgress.events.total += input.newEvents.length;
	}

	// 処理済みエンティティを追跡するセット
	const processedEntities = {
		events: new Set<string>(),
		circles: new Set<string>(),
		artists: new Set<string>(),
		releases: new Set<string>(),
	};

	// 進捗通知ヘルパー（エンティティ進捗を含む）
	const notifyProgress = (
		stage: ImportStage,
		current: number,
		total: number,
		message: string,
	) => {
		if (onProgress) {
			onProgress({ stage, current, total, message, entityProgress });
		}
	};

	// エンティティ処理済みを記録してカウントを更新
	const markEntityProcessed = (
		type: "events" | "circles" | "artists" | "releases",
		name: string,
	) => {
		if (!processedEntities[type].has(name)) {
			processedEntities[type].add(name);
			entityProgress[type].processed = processedEntities[type].size;
		}
	};

	try {
		notifyProgress("preparing", 0, totalRecords, "インポートを準備中...");

		// トランザクション内で処理
		await db.transaction(async (tx) => {
			// 1. 新規イベントを先に処理
			if (input.newEvents && input.newEvents.length > 0) {
				notifyProgress(
					"events",
					0,
					entityProgress.events.total,
					"イベントを登録中...",
				);
				for (let i = 0; i < input.newEvents.length; i++) {
					const newEvent = input.newEvents[i];
					if (newEvent) {
						await processNewEvent(tx, newEvent, cache, result);
						markEntityProcessed("events", newEvent.name);
						notifyProgress(
							"events",
							entityProgress.events.processed,
							entityProgress.events.total,
							`イベント: ${newEvent.name}`,
						);
					}
				}
			}

			// 2. 全レコードを処理
			for (let i = 0; i < input.records.length; i++) {
				const record = input.records[i];
				if (!record) continue;

				const rowNumber = i + 2; // 1-indexed + header row

				try {
					// イベント処理
					const eventName = record.event.trim();
					if (eventName) {
						await processEvent(tx, record, cache, result);
						markEntityProcessed("events", eventName);
						notifyProgress(
							"events",
							entityProgress.events.processed,
							entityProgress.events.total,
							`イベント: ${eventName}`,
						);
					}

					// サークル処理（複合サークルを分割）
					const circleNames = splitCircles(record.circle);
					for (const circleName of circleNames) {
						const normalized = normalizeFullWidthSymbols(circleName.trim());
						if (normalized) {
							await processCircle(tx, circleName, cache, result);
							markEntityProcessed("circles", normalized);
						}
					}
					notifyProgress(
						"circles",
						entityProgress.circles.processed,
						entityProgress.circles.total,
						`サークル: ${entityProgress.circles.processed}/${entityProgress.circles.total}件`,
					);

					// アーティスト処理
					const allArtists = [
						...record.vocalists,
						...record.arrangers,
						...record.lyricists,
					];
					for (const artistName of allArtists) {
						const normalized = normalizeFullWidthSymbols(artistName.trim());
						if (normalized) {
							await processArtist(tx, artistName, cache, result);
							markEntityProcessed("artists", normalized);
						}
					}
					notifyProgress(
						"artists",
						entityProgress.artists.processed,
						entityProgress.artists.total,
						`アーティスト: ${entityProgress.artists.processed}/${entityProgress.artists.total}件`,
					);

					// リリース処理（ディスク情報を考慮）
					const discInfo = parseDiscInfo(record.album);
					const primaryCircle = normalizeFullWidthSymbols(
						circleNames[0]?.trim() || "",
					);
					const releaseKey = `${primaryCircle}:${discInfo.name}`;

					const releaseId = await processRelease(
						tx,
						discInfo.name,
						circleNames,
						cache,
						result,
					);
					markEntityProcessed("releases", releaseKey);
					notifyProgress(
						"releases",
						entityProgress.releases.processed,
						entityProgress.releases.total,
						`作品: ${entityProgress.releases.processed}/${entityProgress.releases.total}件`,
					);

					// ディスク処理
					const discId = await processDisc(
						tx,
						releaseId,
						discInfo.discNumber,
						cache,
						result,
					);

					// トラック処理
					const trackId = await processTrack(
						tx,
						record,
						releaseId,
						discId,
						cache,
						result,
					);
					entityProgress.tracks.processed = i + 1;
					notifyProgress(
						"tracks",
						entityProgress.tracks.processed,
						entityProgress.tracks.total,
						`トラック: ${entityProgress.tracks.processed}/${entityProgress.tracks.total}件`,
					);

					// クレジット処理
					await processCredits(tx, record, trackId, cache, result);

					// 原曲紐付け処理
					await processOfficialSongLinks(
						tx,
						record,
						trackId,
						input.songMappings,
						input.customSongNames,
						result,
					);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					result.errors.push({
						row: rowNumber,
						entity: "record",
						message,
					});
					// 致命的でないエラーは続行
				}
			}
		});

		notifyProgress("complete", totalRecords, totalRecords, "インポート完了");
	} catch (error) {
		result.success = false;
		const message = error instanceof Error ? error.message : "Unknown error";
		result.errors.push({
			row: 0,
			entity: "transaction",
			message: `トランザクションエラー: ${message}`,
		});
		notifyProgress("complete", 0, totalRecords, `エラー: ${message}`);
	}

	if (result.errors.length > 0) {
		result.success = false;
	}

	return result;
}

/**
 * 新規イベントを処理（ウィザードステップから）
 */
async function processNewEvent(
	tx: DbTransaction,
	input: NewEventInput,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const eventName = input.name.trim();
	if (!eventName) return;

	// 既にキャッシュにある場合はスキップ
	if (cache.events.has(eventName)) {
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(events)
		.where(eq(events.name, eventName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.events.set(eventName, existing[0].id);
		return;
	}

	// イベントシリーズを検索
	const editionInfo = parseEventEdition(eventName);
	let eventSeriesId: string | null = null;

	if (editionInfo.baseName) {
		const series = await tx
			.select()
			.from(eventSeries)
			.where(like(eventSeries.name, `%${editionInfo.baseName}%`))
			.limit(1);
		if (series.length > 0 && series[0]) {
			eventSeriesId = series[0].id;
		}
	}

	// イベントを作成
	const newEventId = createId.event();
	await tx.insert(events).values({
		id: newEventId,
		name: eventName,
		eventSeriesId,
		edition: editionInfo.edition,
		totalDays: input.totalDays,
		startDate: input.startDate,
		endDate: input.endDate,
	});

	cache.events.set(eventName, newEventId);
	result.events.created++;

	// イベント開催日を作成
	for (let i = 0; i < input.eventDates.length; i++) {
		const date = input.eventDates[i];
		if (!date) continue;

		await tx.insert(eventDays).values({
			id: createId.eventDay(),
			eventId: newEventId,
			dayNumber: i + 1,
			date,
		});
		result.eventDays.created++;
	}
}

/**
 * イベントを処理（作成または既存を使用）
 */
async function processEvent(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const eventName = record.event.trim();
	if (!eventName) return;

	// キャッシュチェック
	if (cache.events.has(eventName)) {
		result.events.skipped++;
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(events)
		.where(eq(events.name, eventName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.events.set(eventName, existing[0].id);
		result.events.skipped++;
		return;
	}

	// eventSeriesをパターンマッチで検索
	const editionInfo = parseEventEdition(eventName);
	let eventSeriesId: string | null = null;

	if (editionInfo.baseName) {
		const series = await tx
			.select()
			.from(eventSeries)
			.where(like(eventSeries.name, `%${editionInfo.baseName}%`))
			.limit(1);
		if (series.length > 0 && series[0]) {
			eventSeriesId = series[0].id;
		}
	}

	// 新規作成
	const newId = createId.event();
	await tx.insert(events).values({
		id: newId,
		name: eventName,
		eventSeriesId,
		edition: editionInfo.edition,
	});

	cache.events.set(eventName, newId);
	result.events.created++;
}

/**
 * サークルを処理（作成または既存を使用）
 */
async function processCircle(
	tx: DbTransaction,
	circleName: string,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// 全角記号を半角に変換
	const normalizedName = normalizeFullWidthSymbols(circleName.trim());
	if (!normalizedName) return;

	// キャッシュチェック
	if (cache.circles.has(normalizedName)) {
		result.circles.skipped++;
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(circles)
		.where(eq(circles.name, normalizedName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.circles.set(normalizedName, existing[0].id);
		result.circles.skipped++;
		return;
	}

	// 頭文字を判定
	const initial = detectInitial(normalizedName);

	// 名前情報を生成
	const nameInfo = generateNameInfo(normalizedName);

	// ソート名を生成
	const sortName = generateSortName(normalizedName);

	// 新規作成
	const newId = createId.circle();
	await tx.insert(circles).values({
		id: newId,
		name: nameInfo.name,
		nameJa: nameInfo.nameJa,
		nameEn: nameInfo.nameEn,
		sortName,
		initialScript: initial.initialScript,
		nameInitial: initial.nameInitial,
	});

	cache.circles.set(normalizedName, newId);
	result.circles.created++;
}

/**
 * アーティストを処理（作成または既存を使用）
 */
async function processArtist(
	tx: DbTransaction,
	artistName: string,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// 全角記号を半角に変換
	const normalizedName = normalizeFullWidthSymbols(artistName.trim());
	if (!normalizedName) return;

	// キャッシュチェック
	if (cache.artists.has(normalizedName)) {
		result.artists.skipped++;
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(artists)
		.where(eq(artists.name, normalizedName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.artists.set(normalizedName, existing[0].id);
		result.artists.skipped++;
		return;
	}

	// 頭文字を判定
	const initial = detectInitial(normalizedName);

	// 名前情報を生成
	const nameInfo = generateNameInfo(normalizedName);

	// 新規作成
	const newId = createId.artist();
	await tx.insert(artists).values({
		id: newId,
		name: nameInfo.name,
		nameJa: nameInfo.nameJa,
		nameEn: nameInfo.nameEn,
		initialScript: initial.initialScript,
		nameInitial: initial.nameInitial,
	});

	cache.artists.set(normalizedName, newId);
	result.artists.created++;

	// アーティスト名義を「本名義」で作成
	await tx.insert(artistAliases).values({
		id: createId.artistAlias(),
		artistId: newId,
		name: nameInfo.name,
		aliasTypeCode: MAIN_ALIAS_TYPE_CODE,
		initialScript: initial.initialScript,
		nameInitial: initial.nameInitial,
	});

	result.artistAliases.created++;
}

/**
 * リリースを処理（作成または既存を使用）
 */
async function processRelease(
	tx: DbTransaction,
	albumBaseName: string,
	circleNames: string[],
	cache: ImportCache,
	result: ImportResult,
): Promise<string> {
	const primaryCircle = normalizeFullWidthSymbols(circleNames[0]?.trim() || "");
	const cacheKey = `${primaryCircle}:${albumBaseName}`;

	// キャッシュチェック
	if (cache.releases.has(cacheKey)) {
		result.releases.skipped++;
		// biome-ignore lint/style/noNonNullAssertion: cache.releases.has(cacheKey) is true
		return cache.releases.get(cacheKey)!;
	}

	// 既存チェック（サークル名とアルバム名の組み合わせで検索）
	const existingRelease = await findExistingRelease(
		tx,
		albumBaseName,
		primaryCircle,
		cache,
	);
	if (existingRelease) {
		cache.releases.set(cacheKey, existingRelease);
		result.releases.skipped++;
		return existingRelease;
	}

	// 名前情報を生成
	const nameInfo = generateNameInfo(albumBaseName);

	// 新規作成
	const newId = createId.release();
	await tx.insert(releases).values({
		id: newId,
		name: nameInfo.name,
		nameJa: nameInfo.nameJa,
		nameEn: nameInfo.nameEn,
		releaseType: "album", // デフォルトでアルバム
	});

	// releaseCirclesを作成（複数サークルの場合は共同主催）
	const isMultipleCircles = circleNames.length > 1;
	for (let i = 0; i < circleNames.length; i++) {
		const circleName = normalizeFullWidthSymbols(circleNames[i]?.trim() || "");
		if (!circleName) continue;

		const circleId = cache.circles.get(circleName);
		if (circleId) {
			// 複数サークルの場合は全て「共同主催」、単一の場合は「主催」
			const participationType = isMultipleCircles ? "co-host" : "host";
			await tx.insert(releaseCircles).values({
				releaseId: newId,
				circleId,
				participationType,
				position: i + 1,
			});
		}
	}

	cache.releases.set(cacheKey, newId);
	result.releases.created++;
	return newId;
}

/**
 * 既存リリースを検索
 */
async function findExistingRelease(
	tx: DbTransaction,
	albumName: string,
	circleName: string,
	cache: ImportCache,
): Promise<string | null> {
	const circleId = cache.circles.get(circleName);
	if (!circleId) return null;

	// リリース名とサークルIDで検索
	const existing = await tx
		.select({ id: releases.id })
		.from(releases)
		.innerJoin(releaseCircles, eq(releases.id, releaseCircles.releaseId))
		.where(eq(releases.name, albumName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		return existing[0].id;
	}

	return null;
}

/**
 * ディスクを処理（作成または既存を使用）
 */
async function processDisc(
	tx: DbTransaction,
	releaseId: string,
	discNumber: number,
	cache: ImportCache,
	result: ImportResult,
): Promise<string> {
	const cacheKey = `${releaseId}:${discNumber}`;

	// キャッシュチェック
	if (cache.discs.has(cacheKey)) {
		result.discs.skipped++;
		// biome-ignore lint/style/noNonNullAssertion: cache.discs.has(cacheKey) is true
		return cache.discs.get(cacheKey)!;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(discs)
		.where(eq(discs.releaseId, releaseId))
		.limit(100);

	const existingDisc = existing.find(
		(d: { id: string; discNumber: number }) => d.discNumber === discNumber,
	);

	if (existingDisc) {
		cache.discs.set(cacheKey, existingDisc.id);
		result.discs.skipped++;
		return existingDisc.id;
	}

	// 新規作成
	const newId = createId.disc();
	await tx.insert(discs).values({
		id: newId,
		releaseId,
		discNumber,
	});

	cache.discs.set(cacheKey, newId);
	result.discs.created++;
	return newId;
}

/**
 * トラックを処理（作成または更新）
 */
async function processTrack(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	releaseId: string,
	discId: string,
	cache: ImportCache,
	result: ImportResult,
): Promise<string> {
	const cacheKey = `${discId}:${record.trackNumber}`;

	// キャッシュチェック
	if (cache.tracks.has(cacheKey)) {
		result.tracks.skipped++;
		// biome-ignore lint/style/noNonNullAssertion: cache.tracks.has(cacheKey) is true
		return cache.tracks.get(cacheKey)!;
	}

	// 名前情報を生成
	const nameInfo = generateNameInfo(record.title);

	// 既存チェック（upsert）
	const existing = await tx
		.select()
		.from(tracks)
		.where(eq(tracks.discId, discId))
		.limit(100);

	const existingTrack = existing.find(
		(t: { id: string; trackNumber: number | null }) =>
			t.trackNumber === record.trackNumber,
	);

	if (existingTrack) {
		// 更新
		await tx
			.update(tracks)
			.set({
				name: nameInfo.name,
				nameJa: nameInfo.nameJa,
				nameEn: nameInfo.nameEn,
			})
			.where(eq(tracks.id, existingTrack.id));

		cache.tracks.set(cacheKey, existingTrack.id);
		result.tracks.updated++;
		return existingTrack.id;
	}

	// 新規作成
	const newId = createId.track();
	await tx.insert(tracks).values({
		id: newId,
		releaseId,
		discId,
		trackNumber: record.trackNumber,
		name: nameInfo.name,
		nameJa: nameInfo.nameJa,
		nameEn: nameInfo.nameEn,
	});

	cache.tracks.set(cacheKey, newId);
	result.tracks.created++;
	return newId;
}

/**
 * クレジットを処理
 */
async function processCredits(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	trackId: string,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// vocalist
	for (let i = 0; i < record.vocalists.length; i++) {
		const artistName = normalizeFullWidthSymbols(
			record.vocalists[i]?.trim() || "",
		);
		if (!artistName) continue;

		await createCredit(
			tx,
			trackId,
			artistName,
			"vocalist",
			i + 1,
			cache,
			result,
		);
	}

	// arranger
	for (let i = 0; i < record.arrangers.length; i++) {
		const artistName = normalizeFullWidthSymbols(
			record.arrangers[i]?.trim() || "",
		);
		if (!artistName) continue;

		await createCredit(
			tx,
			trackId,
			artistName,
			"arranger",
			i + 1,
			cache,
			result,
		);
	}

	// lyricist
	for (let i = 0; i < record.lyricists.length; i++) {
		const artistName = normalizeFullWidthSymbols(
			record.lyricists[i]?.trim() || "",
		);
		if (!artistName) continue;

		await createCredit(
			tx,
			trackId,
			artistName,
			"lyricist",
			i + 1,
			cache,
			result,
		);
	}
}

/**
 * 単一クレジットを作成
 */
async function createCredit(
	tx: DbTransaction,
	trackId: string,
	artistName: string,
	roleCode: string,
	position: number,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const artistId = cache.artists.get(artistName);
	if (!artistId) return;

	// 既存チェック
	const existing = await tx
		.select()
		.from(trackCredits)
		.where(eq(trackCredits.trackId, trackId))
		.limit(100);

	const existingCredit = existing.find(
		(c: { id: string; artistId: string; creditName: string }) =>
			c.artistId === artistId && c.creditName === artistName,
	);

	let creditId: string;

	if (existingCredit) {
		creditId = existingCredit.id;
		result.credits.skipped++;
	} else {
		// 新規作成
		creditId = createId.trackCredit();
		await tx.insert(trackCredits).values({
			id: creditId,
			trackId,
			artistId,
			creditName: artistName,
			creditPosition: position,
		});
		result.credits.created++;
	}

	// ロールを追加（存在しない場合のみ）
	const existingRoles = await tx
		.select()
		.from(trackCreditRoles)
		.where(eq(trackCreditRoles.trackCreditId, creditId))
		.limit(10);

	const hasRole = existingRoles.some(
		(r: { roleCode: string }) => r.roleCode === roleCode,
	);
	if (!hasRole) {
		await tx.insert(trackCreditRoles).values({
			trackCreditId: creditId,
			roleCode,
			rolePosition: position,
		});
	}
}

/**
 * 原曲紐付けを処理
 */
async function processOfficialSongLinks(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	trackId: string,
	songMappings: Map<string, string>,
	customSongNames: Map<string, string>,
	result: ImportResult,
): Promise<void> {
	for (let i = 0; i < record.originalSongs.length; i++) {
		const originalName = record.originalSongs[i]?.trim();
		if (!originalName) continue;

		const officialSongId = songMappings.get(originalName);
		if (!officialSongId) {
			// マッピングがない場合はスキップ
			result.officialSongLinks.skipped++;
			continue;
		}

		// customSongNameの取得（マッチしない原曲の場合）
		const customSongName = customSongNames.get(originalName) || null;

		// 既存チェック
		const existing = await tx
			.select()
			.from(trackOfficialSongs)
			.where(eq(trackOfficialSongs.trackId, trackId))
			.limit(100);

		const existingLink = existing.find(
			(l: { officialSongId: string | null }) =>
				l.officialSongId === officialSongId,
		);

		if (existingLink) {
			result.officialSongLinks.skipped++;
			continue;
		}

		// 新規作成
		await tx.insert(trackOfficialSongs).values({
			id: createId.trackOfficialSong(),
			trackId,
			officialSongId,
			customSongName,
			partPosition: i + 1,
		});

		result.officialSongLinks.created++;
	}
}

/**
 * 新規イベントが必要かどうかをチェック
 */
export async function checkNewEventsNeeded(
	eventNames: string[],
): Promise<string[]> {
	const newEvents: string[] = [];

	for (const eventName of eventNames) {
		const trimmed = eventName.trim();
		if (!trimmed) continue;

		const existing = await db
			.select()
			.from(events)
			.where(eq(events.name, trimmed))
			.limit(1);

		if (existing.length === 0) {
			newEvents.push(trimmed);
		}
	}

	return [...new Set(newEvents)]; // 重複を除去
}
