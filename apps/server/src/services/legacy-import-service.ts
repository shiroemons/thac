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
	inArray,
	like,
	releaseCircles,
	releases,
	sql,
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

// ============================================================================
// 最適化: 一括プリフェッチ＆一括挿入
// ============================================================================

/**
 * レコードから抽出したユニークなエンティティデータ
 */
interface ExtractedEntities {
	eventNames: Set<string>;
	circleNames: Set<string>;
	artistNames: Set<string>;
	// releaseKey: `${primaryCircle}:${albumBaseName}`
	releaseKeys: Map<string, { albumBaseName: string; circleNames: string[] }>;
	// discKey: `${releaseKey}:${discNumber}`
	discKeys: Map<string, { releaseKey: string; discNumber: number }>;
	// trackKey: `${discKey}:${trackNumber}`
	trackData: Map<
		string,
		{
			releaseKey: string;
			discKey: string;
			trackNumber: number;
			record: LegacyCSVRecord;
		}
	>;
}

/**
 * 全レコードからユニークなエンティティを抽出（1パス）
 */
function extractUniqueEntities(records: LegacyCSVRecord[]): ExtractedEntities {
	const result: ExtractedEntities = {
		eventNames: new Set(),
		circleNames: new Set(),
		artistNames: new Set(),
		releaseKeys: new Map(),
		discKeys: new Map(),
		trackData: new Map(),
	};

	for (const record of records) {
		// イベント
		const eventName = record.event.trim();
		if (eventName) {
			result.eventNames.add(eventName);
		}

		// サークル
		const circleNameList = splitCircles(record.circle);
		for (const name of circleNameList) {
			const normalized = normalizeFullWidthSymbols(name.trim());
			if (normalized) {
				result.circleNames.add(normalized);
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
				result.artistNames.add(normalized);
			}
		}

		// リリース
		const discInfo = parseDiscInfo(record.album);
		const primaryCircle = normalizeFullWidthSymbols(
			circleNameList[0]?.trim() || "",
		);
		const releaseKey = `${primaryCircle}:${discInfo.name}`;
		if (!result.releaseKeys.has(releaseKey)) {
			result.releaseKeys.set(releaseKey, {
				albumBaseName: discInfo.name,
				circleNames: circleNameList.map((n) =>
					normalizeFullWidthSymbols(n.trim()),
				),
			});
		}

		// ディスク
		const discKey = `${releaseKey}:${discInfo.discNumber}`;
		if (!result.discKeys.has(discKey)) {
			result.discKeys.set(discKey, {
				releaseKey,
				discNumber: discInfo.discNumber,
			});
		}

		// トラック
		const trackKey = `${discKey}:${record.trackNumber}`;
		if (!result.trackData.has(trackKey)) {
			result.trackData.set(trackKey, {
				releaseKey,
				discKey,
				trackNumber: record.trackNumber,
				record,
			});
		}
	}

	return result;
}

/**
 * 既存エンティティを一括プリフェッチしてキャッシュに格納
 */
async function prefetchExistingEntities(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
): Promise<void> {
	// イベント一括取得
	const eventNameList = [...extracted.eventNames];
	if (eventNameList.length > 0) {
		const existingEvents = await tx
			.select({ id: events.id, name: events.name })
			.from(events)
			.where(inArray(events.name, eventNameList));
		for (const e of existingEvents) {
			cache.events.set(e.name, e.id);
		}
	}

	// サークル一括取得
	const circleNameList = [...extracted.circleNames];
	if (circleNameList.length > 0) {
		const existingCircles = await tx
			.select({ id: circles.id, name: circles.name })
			.from(circles)
			.where(inArray(circles.name, circleNameList));
		for (const c of existingCircles) {
			cache.circles.set(c.name, c.id);
		}
	}

	// アーティスト一括取得
	const artistNameList = [...extracted.artistNames];
	if (artistNameList.length > 0) {
		const existingArtists = await tx
			.select({ id: artists.id, name: artists.name })
			.from(artists)
			.where(inArray(artists.name, artistNameList));
		for (const a of existingArtists) {
			cache.artists.set(a.name, a.id);
		}
	}

	// リリース一括取得（名前で検索し、後でサークルと照合）
	const albumNames = [
		...new Set([...extracted.releaseKeys.values()].map((r) => r.albumBaseName)),
	];
	if (albumNames.length > 0) {
		const existingReleases = await tx
			.select({
				id: releases.id,
				name: releases.name,
				circleId: releaseCircles.circleId,
			})
			.from(releases)
			.leftJoin(releaseCircles, eq(releases.id, releaseCircles.releaseId))
			.where(inArray(releases.name, albumNames));

		// リリースID -> サークルIDのマップを構築
		const releaseCircleMap = new Map<string, Set<string>>();
		for (const r of existingReleases) {
			if (!releaseCircleMap.has(r.id)) {
				releaseCircleMap.set(r.id, new Set());
			}
			if (r.circleId) {
				releaseCircleMap.get(r.id)?.add(r.circleId);
			}
		}

		// サークル名->IDの逆引き
		for (const [releaseKey, data] of extracted.releaseKeys) {
			const primaryCircleName = data.circleNames[0] || "";
			const primaryCircleId = cache.circles.get(primaryCircleName);

			// 同名リリースでサークルが一致するものを探す
			for (const r of existingReleases) {
				if (r.name === data.albumBaseName) {
					const circleIds = releaseCircleMap.get(r.id);
					if (circleIds && primaryCircleId && circleIds.has(primaryCircleId)) {
						cache.releases.set(releaseKey, r.id);
						break;
					}
				}
			}
		}
	}
}

/**
 * 新規サークルを一括挿入
 */
async function batchInsertCircles(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const newCircles: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		sortName: string | null;
		initialScript: string | null;
		nameInitial: string | null;
	}> = [];

	for (const circleName of extracted.circleNames) {
		if (cache.circles.has(circleName)) {
			result.circles.skipped++;
			continue;
		}

		const initial = detectInitial(circleName);
		const nameInfo = generateNameInfo(circleName);
		const sortName = generateSortName(circleName);
		const newId = createId.circle();

		newCircles.push({
			id: newId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			sortName,
			initialScript: initial.initialScript,
			nameInitial: initial.nameInitial,
		});
		cache.circles.set(circleName, newId);
	}

	if (newCircles.length > 0) {
		await tx
			.insert(circles)
			.values(newCircles)
			.onConflictDoUpdate({
				target: circles.name,
				set: {
					nameJa: sql.raw(`excluded.${circles.nameJa.name}`),
					nameEn: sql.raw(`excluded.${circles.nameEn.name}`),
					sortName: sql.raw(`excluded.${circles.sortName.name}`),
					initialScript: sql.raw(`excluded.${circles.initialScript.name}`),
					nameInitial: sql.raw(`excluded.${circles.nameInitial.name}`),
				},
			});
		result.circles.created += newCircles.length;
	}
}

/**
 * 新規アーティストを一括挿入（エイリアスも同時作成）
 */
async function batchInsertArtists(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const newArtists: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		initialScript: string | null;
		nameInitial: string | null;
	}> = [];

	const newAliases: Array<{
		id: string;
		artistId: string;
		name: string;
		aliasTypeCode: string;
		initialScript: string | null;
		nameInitial: string | null;
	}> = [];

	for (const artistName of extracted.artistNames) {
		if (cache.artists.has(artistName)) {
			result.artists.skipped++;
			continue;
		}

		const initial = detectInitial(artistName);
		const nameInfo = generateNameInfo(artistName);
		const newId = createId.artist();

		newArtists.push({
			id: newId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			initialScript: initial.initialScript,
			nameInitial: initial.nameInitial,
		});

		newAliases.push({
			id: createId.artistAlias(),
			artistId: newId,
			name: nameInfo.name,
			aliasTypeCode: MAIN_ALIAS_TYPE_CODE,
			initialScript: initial.initialScript,
			nameInitial: initial.nameInitial,
		});

		cache.artists.set(artistName, newId);
	}

	if (newArtists.length > 0) {
		await tx
			.insert(artists)
			.values(newArtists)
			.onConflictDoUpdate({
				target: artists.name,
				set: {
					nameJa: sql.raw(`excluded.${artists.nameJa.name}`),
					nameEn: sql.raw(`excluded.${artists.nameEn.name}`),
					initialScript: sql.raw(`excluded.${artists.initialScript.name}`),
					nameInitial: sql.raw(`excluded.${artists.nameInitial.name}`),
				},
			});
		result.artists.created += newArtists.length;
	}

	if (newAliases.length > 0) {
		await tx
			.insert(artistAliases)
			.values(newAliases)
			.onConflictDoNothing({
				target: [artistAliases.artistId, artistAliases.name],
			});
		result.artistAliases.created += newAliases.length;
	}
}

/**
 * 新規リリースを一括挿入（releaseCirclesも同時作成）
 */
async function batchInsertReleases(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const newReleases: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		releaseType: string;
	}> = [];

	const newReleaseCircles: Array<{
		releaseId: string;
		circleId: string;
		participationType: string;
		position: number;
	}> = [];

	for (const [releaseKey, data] of extracted.releaseKeys) {
		if (cache.releases.has(releaseKey)) {
			result.releases.skipped++;
			continue;
		}

		const nameInfo = generateNameInfo(data.albumBaseName);
		const newId = createId.release();

		newReleases.push({
			id: newId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			releaseType: "album",
		});

		// releaseCirclesを準備
		const isMultipleCircles = data.circleNames.length > 1;
		for (let i = 0; i < data.circleNames.length; i++) {
			const circleName = data.circleNames[i];
			if (!circleName) continue;

			const circleId = cache.circles.get(circleName);
			if (circleId) {
				newReleaseCircles.push({
					releaseId: newId,
					circleId,
					participationType: isMultipleCircles ? "co-host" : "host",
					position: i + 1,
				});
			}
		}

		cache.releases.set(releaseKey, newId);
	}

	if (newReleases.length > 0) {
		// releasesにはビジネスキーのユニーク制約がないため通常INSERT
		// 重複チェックはprefetchExistingEntitiesで実施済み
		await tx.insert(releases).values(newReleases);
		result.releases.created += newReleases.length;
	}

	if (newReleaseCircles.length > 0) {
		await tx
			.insert(releaseCircles)
			.values(newReleaseCircles)
			.onConflictDoNothing({
				target: [
					releaseCircles.releaseId,
					releaseCircles.circleId,
					releaseCircles.participationType,
				],
			});
	}
}

/**
 * 新規ディスクを一括挿入
 */
async function batchInsertDiscs(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// 既存ディスクをプリフェッチ
	const releaseIds = [...new Set([...cache.releases.values()])];
	if (releaseIds.length > 0) {
		const existingDiscs = await tx
			.select({
				id: discs.id,
				releaseId: discs.releaseId,
				discNumber: discs.discNumber,
			})
			.from(discs)
			.where(inArray(discs.releaseId, releaseIds));

		for (const d of existingDiscs) {
			// releaseIdからreleaseKeyを逆引き
			for (const [releaseKey, releaseId] of cache.releases) {
				if (releaseId === d.releaseId) {
					const discKey = `${releaseKey}:${d.discNumber}`;
					cache.discs.set(discKey, d.id);
				}
			}
		}
	}

	const newDiscs: Array<{
		id: string;
		releaseId: string;
		discNumber: number;
	}> = [];

	for (const [discKey, data] of extracted.discKeys) {
		if (cache.discs.has(discKey)) {
			result.discs.skipped++;
			continue;
		}

		const releaseId = cache.releases.get(data.releaseKey);
		if (!releaseId) continue;

		const newId = createId.disc();
		newDiscs.push({
			id: newId,
			releaseId,
			discNumber: data.discNumber,
		});
		cache.discs.set(discKey, newId);
	}

	if (newDiscs.length > 0) {
		await tx
			.insert(discs)
			.values(newDiscs)
			.onConflictDoNothing({
				target: [discs.releaseId, discs.discNumber],
			});
		result.discs.created += newDiscs.length;
	}
}

/**
 * 新規トラックを一括挿入
 */
async function batchInsertTracks(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// 既存トラックをプリフェッチ
	const discIds = [...new Set([...cache.discs.values()])];
	if (discIds.length > 0) {
		const existingTracks = await tx
			.select({
				id: tracks.id,
				discId: tracks.discId,
				trackNumber: tracks.trackNumber,
			})
			.from(tracks)
			.where(inArray(tracks.discId, discIds));

		for (const t of existingTracks) {
			// discIdからdiscKeyを逆引き
			for (const [discKey, discId] of cache.discs) {
				if (discId === t.discId) {
					const trackKey = `${discKey}:${t.trackNumber}`;
					cache.tracks.set(trackKey, t.id);
				}
			}
		}
	}

	const newTracks: Array<{
		id: string;
		releaseId: string;
		discId: string;
		trackNumber: number;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
	}> = [];

	for (const [trackKey, data] of extracted.trackData) {
		if (cache.tracks.has(trackKey)) {
			result.tracks.skipped++;
			continue;
		}

		const releaseId = cache.releases.get(data.releaseKey);
		const discId = cache.discs.get(data.discKey);
		if (!releaseId || !discId) continue;

		const nameInfo = generateNameInfo(data.record.title);
		const newId = createId.track();

		newTracks.push({
			id: newId,
			releaseId,
			discId,
			trackNumber: data.trackNumber,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
		});
		cache.tracks.set(trackKey, newId);
	}

	if (newTracks.length > 0) {
		// tracksは条件付きユニーク制約(discId, trackNumber)を持つ
		// 同一ディスク+同一トラック番号の重複はスキップ
		await tx.insert(tracks).values(newTracks).onConflictDoNothing();
		result.tracks.created += newTracks.length;
	}
}

/**
 * クレジットを一括挿入
 */
async function batchInsertCredits(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	// 既存クレジットをプリフェッチ
	const trackIds = [...new Set([...cache.tracks.values()])];
	const existingCreditsMap = new Map<
		string,
		{ id: string; artistId: string; creditName: string }[]
	>();

	if (trackIds.length > 0) {
		const existingCredits = await tx
			.select({
				id: trackCredits.id,
				trackId: trackCredits.trackId,
				artistId: trackCredits.artistId,
				creditName: trackCredits.creditName,
			})
			.from(trackCredits)
			.where(inArray(trackCredits.trackId, trackIds));

		for (const c of existingCredits) {
			if (!existingCreditsMap.has(c.trackId)) {
				existingCreditsMap.set(c.trackId, []);
			}
			existingCreditsMap.get(c.trackId)?.push({
				id: c.id,
				artistId: c.artistId,
				creditName: c.creditName,
			});
		}
	}

	const newCredits: Array<{
		id: string;
		trackId: string;
		artistId: string;
		creditName: string;
		creditPosition: number;
	}> = [];

	const creditRolesToAdd: Array<{
		trackCreditId: string;
		roleCode: string;
		rolePosition: number;
	}> = [];

	// trackKey -> creditId のマップ（ロール追加用）
	const creditIdMap = new Map<string, string>();

	for (const [trackKey, data] of extracted.trackData) {
		const trackId = cache.tracks.get(trackKey);
		if (!trackId) continue;

		const existingCreditsForTrack = existingCreditsMap.get(trackId) || [];

		// vocalist
		for (let i = 0; i < data.record.vocalists.length; i++) {
			const artistName = normalizeFullWidthSymbols(
				data.record.vocalists[i]?.trim() || "",
			);
			if (!artistName) continue;

			const artistId = cache.artists.get(artistName);
			if (!artistId) continue;

			const creditKey = `${trackId}:${artistId}:${artistName}`;
			let creditId = creditIdMap.get(creditKey);

			// 既存チェック
			const existing = existingCreditsForTrack.find(
				(c) => c.artistId === artistId && c.creditName === artistName,
			);

			if (existing) {
				creditId = existing.id;
				result.credits.skipped++;
			} else if (!creditId) {
				creditId = createId.trackCredit();
				newCredits.push({
					id: creditId,
					trackId,
					artistId,
					creditName: artistName,
					creditPosition: i + 1,
				});
				creditIdMap.set(creditKey, creditId);
			}

			if (creditId) {
				creditRolesToAdd.push({
					trackCreditId: creditId,
					roleCode: "vocalist",
					rolePosition: i + 1,
				});
			}
		}

		// arranger
		for (let i = 0; i < data.record.arrangers.length; i++) {
			const artistName = normalizeFullWidthSymbols(
				data.record.arrangers[i]?.trim() || "",
			);
			if (!artistName) continue;

			const artistId = cache.artists.get(artistName);
			if (!artistId) continue;

			const creditKey = `${trackId}:${artistId}:${artistName}`;
			let creditId = creditIdMap.get(creditKey);

			const existing = existingCreditsForTrack.find(
				(c) => c.artistId === artistId && c.creditName === artistName,
			);

			if (existing) {
				creditId = existing.id;
			} else if (!creditId) {
				creditId = createId.trackCredit();
				newCredits.push({
					id: creditId,
					trackId,
					artistId,
					creditName: artistName,
					creditPosition: i + 1,
				});
				creditIdMap.set(creditKey, creditId);
			}

			if (creditId) {
				creditRolesToAdd.push({
					trackCreditId: creditId,
					roleCode: "arranger",
					rolePosition: i + 1,
				});
			}
		}

		// lyricist
		for (let i = 0; i < data.record.lyricists.length; i++) {
			const artistName = normalizeFullWidthSymbols(
				data.record.lyricists[i]?.trim() || "",
			);
			if (!artistName) continue;

			const artistId = cache.artists.get(artistName);
			if (!artistId) continue;

			const creditKey = `${trackId}:${artistId}:${artistName}`;
			let creditId = creditIdMap.get(creditKey);

			const existing = existingCreditsForTrack.find(
				(c) => c.artistId === artistId && c.creditName === artistName,
			);

			if (existing) {
				creditId = existing.id;
			} else if (!creditId) {
				creditId = createId.trackCredit();
				newCredits.push({
					id: creditId,
					trackId,
					artistId,
					creditName: artistName,
					creditPosition: i + 1,
				});
				creditIdMap.set(creditKey, creditId);
			}

			if (creditId) {
				creditRolesToAdd.push({
					trackCreditId: creditId,
					roleCode: "lyricist",
					rolePosition: i + 1,
				});
			}
		}
	}

	if (newCredits.length > 0) {
		// trackCreditsは条件付きユニーク制約(trackId, artistId)を持つ
		// 同一トラック+同一アーティストの重複はスキップ
		await tx.insert(trackCredits).values(newCredits).onConflictDoNothing();
		result.credits.created += newCredits.length;
	}

	// 既存ロールをプリフェッチ
	const allCreditIds = [
		...new Set([
			...newCredits.map((c) => c.id),
			...creditRolesToAdd.map((r) => r.trackCreditId),
		]),
	];
	const existingRolesSet = new Set<string>();

	if (allCreditIds.length > 0) {
		const existingRoles = await tx
			.select({
				trackCreditId: trackCreditRoles.trackCreditId,
				roleCode: trackCreditRoles.roleCode,
			})
			.from(trackCreditRoles)
			.where(inArray(trackCreditRoles.trackCreditId, allCreditIds));

		for (const r of existingRoles) {
			existingRolesSet.add(`${r.trackCreditId}:${r.roleCode}`);
		}
	}

	// 新規ロールのみフィルタ
	const newRoles = creditRolesToAdd.filter(
		(r) => !existingRolesSet.has(`${r.trackCreditId}:${r.roleCode}`),
	);

	if (newRoles.length > 0) {
		await tx
			.insert(trackCreditRoles)
			.values(newRoles)
			.onConflictDoNothing({
				target: [
					trackCreditRoles.trackCreditId,
					trackCreditRoles.roleCode,
					trackCreditRoles.rolePosition,
				],
			});
	}
}

/**
 * 原曲紐付けを一括挿入
 */
async function batchInsertOfficialSongLinks(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	songMappings: Map<string, string>,
	customSongNames: Map<string, string>,
	result: ImportResult,
): Promise<void> {
	// 既存紐付けをプリフェッチ
	const trackIds = [...new Set([...cache.tracks.values()])];
	const existingLinksMap = new Map<string, Set<string>>();

	if (trackIds.length > 0) {
		const existingLinks = await tx
			.select({
				trackId: trackOfficialSongs.trackId,
				officialSongId: trackOfficialSongs.officialSongId,
			})
			.from(trackOfficialSongs)
			.where(inArray(trackOfficialSongs.trackId, trackIds));

		for (const l of existingLinks) {
			if (!existingLinksMap.has(l.trackId)) {
				existingLinksMap.set(l.trackId, new Set());
			}
			if (l.officialSongId) {
				existingLinksMap.get(l.trackId)?.add(l.officialSongId);
			}
		}
	}

	const newLinks: Array<{
		id: string;
		trackId: string;
		officialSongId: string;
		customSongName: string | null;
		partPosition: number;
	}> = [];

	for (const [trackKey, data] of extracted.trackData) {
		const trackId = cache.tracks.get(trackKey);
		if (!trackId) continue;

		const existingLinksForTrack = existingLinksMap.get(trackId) || new Set();

		for (let i = 0; i < data.record.originalSongs.length; i++) {
			const originalName = data.record.originalSongs[i]?.trim();
			if (!originalName) continue;

			const officialSongId = songMappings.get(originalName);
			if (!officialSongId) {
				result.officialSongLinks.skipped++;
				continue;
			}

			if (existingLinksForTrack.has(officialSongId)) {
				result.officialSongLinks.skipped++;
				continue;
			}

			const customSongName = customSongNames.get(originalName) || null;

			newLinks.push({
				id: createId.trackOfficialSong(),
				trackId,
				officialSongId,
				customSongName,
				partPosition: i + 1,
			});
		}
	}

	if (newLinks.length > 0) {
		await tx
			.insert(trackOfficialSongs)
			.values(newLinks)
			.onConflictDoUpdate({
				target: [
					trackOfficialSongs.trackId,
					trackOfficialSongs.officialSongId,
					trackOfficialSongs.partPosition,
				],
				set: {
					customSongName: sql.raw(
						`excluded.${trackOfficialSongs.customSongName.name}`,
					),
				},
			});
		result.officialSongLinks.created += newLinks.length;
	}
}

/**
 * レガシーCSVデータをインポートする（最適化版: 一括プリフェッチ＆一括挿入）
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

	try {
		notifyProgress("preparing", 0, totalRecords, "データを解析中...");

		// Phase 1: 全レコードからユニークなエンティティを抽出（1パス）
		const extracted = extractUniqueEntities(input.records);

		// トランザクション内で一括処理
		await db.transaction(async (tx) => {
			// Phase 2: 既存エンティティを一括プリフェッチ
			notifyProgress("preparing", 0, totalRecords, "既存データを確認中...");
			await prefetchExistingEntities(tx, extracted, cache);

			// Phase 3: 新規イベントを処理（これは個別処理が必要）
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
						entityProgress.events.processed++;
						notifyProgress(
							"events",
							entityProgress.events.processed,
							entityProgress.events.total,
							`イベント: ${newEvent.name}`,
						);
					}
				}
			}

			// CSV内のイベントも処理
			for (const eventName of extracted.eventNames) {
				if (!cache.events.has(eventName)) {
					// 新規イベントを作成
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

					const newId = createId.event();
					await tx.insert(events).values({
						id: newId,
						name: eventName,
						eventSeriesId,
						edition: editionInfo.edition,
					});
					cache.events.set(eventName, newId);
					result.events.created++;
				} else {
					result.events.skipped++;
				}
				entityProgress.events.processed++;
			}
			notifyProgress(
				"events",
				entityProgress.events.processed,
				entityProgress.events.total,
				`イベント: ${entityProgress.events.processed}/${entityProgress.events.total}件`,
			);

			// Phase 4: サークルを一括挿入
			notifyProgress(
				"circles",
				0,
				entityProgress.circles.total,
				"サークルを登録中...",
			);
			await batchInsertCircles(tx, extracted, cache, result);
			entityProgress.circles.processed = extracted.circleNames.size;
			notifyProgress(
				"circles",
				entityProgress.circles.processed,
				entityProgress.circles.total,
				`サークル: ${entityProgress.circles.processed}/${entityProgress.circles.total}件`,
			);

			// Phase 5: アーティストを一括挿入
			notifyProgress(
				"artists",
				0,
				entityProgress.artists.total,
				"アーティストを登録中...",
			);
			await batchInsertArtists(tx, extracted, cache, result);
			entityProgress.artists.processed = extracted.artistNames.size;
			notifyProgress(
				"artists",
				entityProgress.artists.processed,
				entityProgress.artists.total,
				`アーティスト: ${entityProgress.artists.processed}/${entityProgress.artists.total}件`,
			);

			// Phase 6: リリースを一括挿入
			notifyProgress(
				"releases",
				0,
				entityProgress.releases.total,
				"作品を登録中...",
			);
			await batchInsertReleases(tx, extracted, cache, result);
			entityProgress.releases.processed = extracted.releaseKeys.size;
			notifyProgress(
				"releases",
				entityProgress.releases.processed,
				entityProgress.releases.total,
				`作品: ${entityProgress.releases.processed}/${entityProgress.releases.total}件`,
			);

			// Phase 7: ディスクを一括挿入
			notifyProgress(
				"tracks",
				0,
				entityProgress.tracks.total,
				"ディスクを登録中...",
			);
			await batchInsertDiscs(tx, extracted, cache, result);

			// Phase 8: トラックを一括挿入
			notifyProgress(
				"tracks",
				0,
				entityProgress.tracks.total,
				"トラックを登録中...",
			);
			await batchInsertTracks(tx, extracted, cache, result);
			entityProgress.tracks.processed = extracted.trackData.size;
			notifyProgress(
				"tracks",
				entityProgress.tracks.processed,
				entityProgress.tracks.total,
				`トラック: ${entityProgress.tracks.processed}/${entityProgress.tracks.total}件`,
			);

			// Phase 9: クレジットを一括挿入
			notifyProgress("credits", 0, totalRecords, "クレジットを登録中...");
			await batchInsertCredits(tx, extracted, cache, result);
			notifyProgress(
				"credits",
				totalRecords,
				totalRecords,
				"クレジット登録完了",
			);

			// Phase 10: 原曲紐付けを一括挿入
			notifyProgress("links", 0, totalRecords, "原曲紐付けを登録中...");
			await batchInsertOfficialSongLinks(
				tx,
				extracted,
				cache,
				input.songMappings,
				input.customSongNames,
				result,
			);
			notifyProgress("links", totalRecords, totalRecords, "原曲紐付け登録完了");
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
