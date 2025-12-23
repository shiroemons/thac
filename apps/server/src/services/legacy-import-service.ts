/**
 * レガシーCSVインポートサービス
 *
 * パースされたCSVデータをデータベースに登録するサービス。
 * 依存関係順（events → circles → artists → releases → tracks → credits）で処理する。
 */

import {
	artists,
	circles,
	createId,
	db,
	eq,
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

export interface ImportInput {
	records: LegacyCSVRecord[];
	songMappings: Map<string, string>; // originalName -> officialSongId
	customSongNames: Map<string, string>; // originalName -> customSongName（マッチしない原曲用）
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
	circles: EntityCount;
	artists: EntityCount;
	releases: EntityCount;
	tracks: EntityCount;
	credits: EntityCount;
	officialSongLinks: EntityCount;
	errors: ImportError[];
}

// キャッシュ用のマップ
interface ImportCache {
	events: Map<string, string>; // eventName -> eventId
	circles: Map<string, string>; // circleName -> circleId
	artists: Map<string, string>; // artistName -> artistId
	releases: Map<string, string>; // `${circleName}:${albumName}` -> releaseId
	tracks: Map<string, string>; // `${releaseId}:${trackNumber}` -> trackId
}

// トランザクション型
// biome-ignore lint/suspicious/noExplicitAny: Transaction type is complex
type DbTransaction = any;

/**
 * レガシーCSVデータをインポートする
 */
export async function executeLegacyImport(
	input: ImportInput,
): Promise<ImportResult> {
	const result: ImportResult = {
		success: true,
		events: { created: 0, updated: 0, skipped: 0 },
		circles: { created: 0, updated: 0, skipped: 0 },
		artists: { created: 0, updated: 0, skipped: 0 },
		releases: { created: 0, updated: 0, skipped: 0 },
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
		tracks: new Map(),
	};

	try {
		// トランザクション内で処理
		await db.transaction(async (tx) => {
			for (let i = 0; i < input.records.length; i++) {
				const record = input.records[i];
				if (!record) continue;

				const rowNumber = i + 2; // 1-indexed + header row

				try {
					// 1. イベント処理
					await processEvent(tx, record, cache, result);

					// 2. サークル処理（複合サークルを分割）
					const circleNames = splitCircles(record.circle);
					for (const circleName of circleNames) {
						await processCircle(tx, circleName, cache, result);
					}

					// 3. アーティスト処理
					const allArtists = [
						...record.vocalists,
						...record.arrangers,
						...record.lyricists,
					];
					for (const artistName of allArtists) {
						await processArtist(tx, artistName, cache, result);
					}

					// 4. リリース処理
					const releaseId = await processRelease(
						tx,
						record,
						circleNames,
						cache,
						result,
					);

					// 5. トラック処理
					const trackId = await processTrack(
						tx,
						record,
						releaseId,
						cache,
						result,
					);

					// 6. クレジット処理
					await processCredits(tx, record, trackId, cache, result);

					// 7. 原曲紐付け処理
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
	} catch (error) {
		result.success = false;
		const message = error instanceof Error ? error.message : "Unknown error";
		result.errors.push({
			row: 0,
			entity: "transaction",
			message: `トランザクションエラー: ${message}`,
		});
	}

	if (result.errors.length > 0) {
		result.success = false;
	}

	return result;
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
	let eventSeriesId: string | null = null;
	const seriesPattern = extractSeriesPattern(eventName);
	if (seriesPattern) {
		const series = await tx
			.select()
			.from(eventSeries)
			.where(like(eventSeries.name, `%${seriesPattern}%`))
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
	});

	cache.events.set(eventName, newId);
	result.events.created++;
}

/**
 * イベント名からシリーズ名パターンを抽出
 */
function extractSeriesPattern(eventName: string): string | null {
	// コミックマーケット、例大祭などのパターン
	const patterns = [
		/^(.+?)(\d+)$/, // "コミケ100" → "コミケ"
		/^(.+?)(第\d+回)$/, // "例大祭第20回" → "例大祭"
		/^(.+?)(\s*\d+)$/, // "M3 50" → "M3"
	];

	for (const pattern of patterns) {
		const match = eventName.match(pattern);
		if (match && match[1]) {
			return match[1].trim();
		}
	}

	return null;
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
	const name = circleName.trim();
	if (!name) return;

	// キャッシュチェック
	if (cache.circles.has(name)) {
		result.circles.skipped++;
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(circles)
		.where(eq(circles.name, name))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.circles.set(name, existing[0].id);
		result.circles.skipped++;
		return;
	}

	// 頭文字を判定
	const initial = detectInitial(name);

	// 新規作成
	const newId = createId.circle();
	await tx.insert(circles).values({
		id: newId,
		name,
		initialScript: initial.initialScript,
		nameInitial: initial.nameInitial,
	});

	cache.circles.set(name, newId);
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
	const name = artistName.trim();
	if (!name) return;

	// キャッシュチェック
	if (cache.artists.has(name)) {
		result.artists.skipped++;
		return;
	}

	// 既存チェック
	const existing = await tx
		.select()
		.from(artists)
		.where(eq(artists.name, name))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		cache.artists.set(name, existing[0].id);
		result.artists.skipped++;
		return;
	}

	// 頭文字を判定
	const initial = detectInitial(name);

	// 新規作成
	const newId = createId.artist();
	await tx.insert(artists).values({
		id: newId,
		name,
		initialScript: initial.initialScript,
		nameInitial: initial.nameInitial,
	});

	cache.artists.set(name, newId);
	result.artists.created++;
}

/**
 * リリースを処理（作成または既存を使用）
 */
async function processRelease(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	circleNames: string[],
	cache: ImportCache,
	result: ImportResult,
): Promise<string> {
	const albumName = record.album.trim();
	const primaryCircle = circleNames[0]?.trim() || "";
	const cacheKey = `${primaryCircle}:${albumName}`;

	// キャッシュチェック
	if (cache.releases.has(cacheKey)) {
		result.releases.skipped++;
		// biome-ignore lint/style/noNonNullAssertion: cache.releases.has(cacheKey) is true
		return cache.releases.get(cacheKey)!;
	}

	// 既存チェック（サークル名とアルバム名の組み合わせで検索）
	const existingRelease = await findExistingRelease(
		tx,
		albumName,
		primaryCircle,
		cache,
	);
	if (existingRelease) {
		cache.releases.set(cacheKey, existingRelease);
		result.releases.skipped++;
		return existingRelease;
	}

	// 新規作成
	const newId = createId.release();
	await tx.insert(releases).values({
		id: newId,
		name: albumName,
	});

	// releaseCirclesを作成（複合サークルの場合は複数）
	for (let i = 0; i < circleNames.length; i++) {
		const circleName = circleNames[i]?.trim();
		if (!circleName) continue;

		const circleId = cache.circles.get(circleName);
		if (circleId) {
			await tx.insert(releaseCircles).values({
				releaseId: newId,
				circleId,
				participationType: i === 0 ? "host" : "co-host",
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
 * トラックを処理（作成または更新）
 */
async function processTrack(
	tx: DbTransaction,
	record: LegacyCSVRecord,
	releaseId: string,
	cache: ImportCache,
	result: ImportResult,
): Promise<string> {
	const cacheKey = `${releaseId}:${record.trackNumber}`;

	// キャッシュチェック
	if (cache.tracks.has(cacheKey)) {
		result.tracks.skipped++;
		// biome-ignore lint/style/noNonNullAssertion: cache.tracks.has(cacheKey) is true
		return cache.tracks.get(cacheKey)!;
	}

	// 既存チェック（upsert）
	const existing = await tx
		.select()
		.from(tracks)
		.where(eq(tracks.releaseId, releaseId))
		.limit(100);

	const existingTrack = existing.find(
		(t: { id: string; trackNumber: number | null }) =>
			t.trackNumber === record.trackNumber,
	);

	if (existingTrack) {
		// 更新
		await tx
			.update(tracks)
			.set({ name: record.title })
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
		trackNumber: record.trackNumber,
		name: record.title,
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
		const artistName = record.vocalists[i]?.trim();
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
		const artistName = record.arrangers[i]?.trim();
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
		const artistName = record.lyricists[i]?.trim();
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
