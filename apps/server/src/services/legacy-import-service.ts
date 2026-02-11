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

// バッチ処理のデフォルトサイズ
const BATCH_SIZE = 1000;

/**
 * 配列を指定サイズのチャンクに分割する
 */
function chunk<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

export interface ImportInput {
	records: LegacyCSVRecord[];
	songMappings: Map<string, string>; // originalName -> officialSongId
	customSongNames: Map<string, string>; // originalName -> customSongName（マッチしない原曲用）
	newEvents?: NewEventInput[]; // 新規イベント情報
	eventDayMappings?: Map<string, string>; // eventName -> eventDayId（既存イベントのイベント日選択用）
}

export interface NewEventInput {
	name: string;
	totalDays: number;
	startDate: string;
	endDate: string;
	eventDates: string[]; // 各日の日付
	eventSeriesId?: string | null;
	eventSeriesName?: string | null;
}

/**
 * イベントの設定状態
 */
export interface EventConfigurationStatus {
	name: string;
	exists: boolean;
	eventId?: string;
	hasEventDays: boolean;
	eventDaysCount: number;
	hasStartDate: boolean;
	hasTotalDays: boolean;
	needsConfiguration: boolean; // 設定が必要かどうか
}

/**
 * 既存イベントのイベント日情報
 */
export interface ExistingEventDay {
	id: string;
	dayNumber: number;
	eventDate: string | null;
}

/**
 * 複数日を持つ既存イベント情報
 */
export interface ExistingEventWithDays {
	eventId: string;
	eventName: string;
	eventDays: ExistingEventDay[];
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

export interface BatchSummary {
	totalBatches: number;
	successfulBatches: number;
	failedBatches: number;
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
	batchSummary: BatchSummary;
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

		// 作品（サークル名:アルバムベース名）
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
/**
 * キャッシュされるエンティティ情報
 * id: エンティティのID
 * hasNameJa: nameJaが設定されているかどうか
 */
interface CachedEntityInfo {
	id: string;
	hasNameJa: boolean;
}

/**
 * イベント日のキャッシュ情報
 */
interface CachedEventDayInfo {
	id: string;
	date: string;
}

/**
 * 作品のキャッシュ情報（イベント情報含む）
 */
interface CachedReleaseInfo {
	id: string;
	eventId: string | null;
	eventDayId: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
}

interface ImportCache {
	events: Map<string, string>; // eventName -> eventId
	eventDays: Map<string, CachedEventDayInfo>; // eventId -> { id, date } (1日目のみ)
	circles: Map<string, CachedEntityInfo>; // circleName -> { id, hasNameJa }
	artists: Map<string, CachedEntityInfo>; // artistName -> { id, hasNameJa }
	artistAliases: Map<string, string>; // artistName -> aliasId (本名義のID)
	releases: Map<string, CachedReleaseInfo>; // `${circleName}:${albumBaseName}` -> releaseInfo
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
	releaseKeys: Map<
		string,
		{ albumBaseName: string; circleNames: string[]; eventName: string }
	>;
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

		// 作品
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
				eventName: record.event.trim(),
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

		// イベント日を一括取得（1日目のみ）
		const eventIds = existingEvents.map((e: { id: string }) => e.id);
		if (eventIds.length > 0) {
			const existingEventDays = await tx
				.select({
					id: eventDays.id,
					eventId: eventDays.eventId,
					dayNumber: eventDays.dayNumber,
					date: eventDays.date,
				})
				.from(eventDays)
				.where(inArray(eventDays.eventId, eventIds));

			// 各イベントの1日目をキャッシュ
			for (const day of existingEventDays) {
				if (day.dayNumber === 1) {
					cache.eventDays.set(day.eventId, {
						id: day.id,
						date: day.date,
					});
				}
			}
		}
	}

	// サークル一括取得（nameJaも取得して更新要否を判定）
	const circleNameList = [...extracted.circleNames];
	if (circleNameList.length > 0) {
		const existingCircles = await tx
			.select({ id: circles.id, name: circles.name, nameJa: circles.nameJa })
			.from(circles)
			.where(inArray(circles.name, circleNameList));
		for (const c of existingCircles) {
			cache.circles.set(c.name, {
				id: c.id,
				hasNameJa: c.nameJa !== null,
			});
		}
	}

	// アーティスト一括取得（nameJaも取得して更新要否を判定）
	const artistNameList = [...extracted.artistNames];
	if (artistNameList.length > 0) {
		const existingArtists = await tx
			.select({ id: artists.id, name: artists.name, nameJa: artists.nameJa })
			.from(artists)
			.where(inArray(artists.name, artistNameList));
		for (const a of existingArtists) {
			cache.artists.set(a.name, {
				id: a.id,
				hasNameJa: a.nameJa !== null,
			});
		}

		// 既存アーティストの本名義を一括取得
		const artistIds = existingArtists.map(
			(a: { id: string; name: string; nameJa: string | null }) => a.id,
		);
		if (artistIds.length > 0) {
			const existingAliases = await tx
				.select({
					id: artistAliases.id,
					artistId: artistAliases.artistId,
					name: artistAliases.name,
					aliasTypeCode: artistAliases.aliasTypeCode,
				})
				.from(artistAliases)
				.where(inArray(artistAliases.artistId, artistIds));

			// アーティスト名と同じ名前の本名義をキャッシュ
			for (const alias of existingAliases) {
				// 本名義（main）またはアーティスト名と一致する名義をキャッシュ
				const artistEntry = existingArtists.find(
					(a: { id: string; name: string; nameJa: string | null }) =>
						a.id === alias.artistId,
				);
				if (
					artistEntry &&
					(alias.aliasTypeCode === MAIN_ALIAS_TYPE_CODE ||
						alias.name === artistEntry.name)
				) {
					cache.artistAliases.set(artistEntry.name, alias.id);
				}
			}
		}
	}

	// 作品一括取得（名前で検索し、後でサークルと照合）
	const albumNames = [
		...new Set([...extracted.releaseKeys.values()].map((r) => r.albumBaseName)),
	];
	if (albumNames.length > 0) {
		const existingReleases = await tx
			.select({
				id: releases.id,
				name: releases.name,
				circleId: releaseCircles.circleId,
				eventId: releases.eventId,
				eventDayId: releases.eventDayId,
				releaseDate: releases.releaseDate,
				releaseYear: releases.releaseYear,
				releaseMonth: releases.releaseMonth,
				releaseDay: releases.releaseDay,
			})
			.from(releases)
			.leftJoin(releaseCircles, eq(releases.id, releaseCircles.releaseId))
			.where(inArray(releases.name, albumNames));

		// 作品ID -> サークルID & イベント情報のマップを構築
		const releaseCircleMap = new Map<string, Set<string>>();
		const releaseInfoMap = new Map<
			string,
			{
				eventId: string | null;
				eventDayId: string | null;
				releaseDate: string | null;
				releaseYear: number | null;
				releaseMonth: number | null;
				releaseDay: number | null;
			}
		>();
		for (const r of existingReleases) {
			if (!releaseCircleMap.has(r.id)) {
				releaseCircleMap.set(r.id, new Set());
				releaseInfoMap.set(r.id, {
					eventId: r.eventId,
					eventDayId: r.eventDayId,
					releaseDate: r.releaseDate,
					releaseYear: r.releaseYear,
					releaseMonth: r.releaseMonth,
					releaseDay: r.releaseDay,
				});
			}
			if (r.circleId) {
				releaseCircleMap.get(r.id)?.add(r.circleId);
			}
		}

		// サークル名->IDの逆引き
		for (const [releaseKey, data] of extracted.releaseKeys) {
			const primaryCircleName = data.circleNames[0] || "";
			const primaryCircleInfo = cache.circles.get(primaryCircleName);

			// 同名作品でサークルが一致するものを探す
			for (const r of existingReleases) {
				if (r.name === data.albumBaseName) {
					const circleIds = releaseCircleMap.get(r.id);
					if (
						circleIds &&
						primaryCircleInfo &&
						circleIds.has(primaryCircleInfo.id)
					) {
						const releaseInfo = releaseInfoMap.get(r.id);
						cache.releases.set(releaseKey, {
							id: r.id,
							eventId: releaseInfo?.eventId ?? null,
							eventDayId: releaseInfo?.eventDayId ?? null,
							releaseDate: releaseInfo?.releaseDate ?? null,
							releaseYear: releaseInfo?.releaseYear ?? null,
							releaseMonth: releaseInfo?.releaseMonth ?? null,
							releaseDay: releaseInfo?.releaseDay ?? null,
						});
						break;
					}
				}
			}
		}
	}
}

/**
 * サークルを一括挿入/更新
 * - 新規: 新しいIDで挿入
 * - 既存でnameJa未設定: 既存IDで更新（UPSERT）
 * - 既存でnameJa設定済み: スキップ
 */
async function batchInsertCircles(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const circlesToUpsert: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		sortName: string | null;
		initialScript: string | null;
		nameInitial: string | null;
	}> = [];

	for (const circleName of extracted.circleNames) {
		const cached = cache.circles.get(circleName);

		// 既存でnameJa設定済みならスキップ
		if (cached?.hasNameJa) {
			result.circles.skipped++;
			continue;
		}

		const initial = detectInitial(circleName);
		const nameInfo = generateNameInfo(circleName);
		const sortName = generateSortName(circleName);
		// 既存の場合は既存IDを使用、新規の場合は新しいIDを生成
		const circleId = cached?.id ?? createId.circle();

		circlesToUpsert.push({
			id: circleId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			sortName,
			initialScript: initial.initialScript,
			nameInitial: initial.nameInitial,
		});

		// キャッシュを更新
		cache.circles.set(circleName, {
			id: circleId,
			hasNameJa: nameInfo.nameJa !== null,
		});
	}

	if (circlesToUpsert.length > 0) {
		await tx
			.insert(circles)
			.values(circlesToUpsert)
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
		result.circles.created += circlesToUpsert.length;
	}
}

/**
 * アーティストを一括挿入/更新（エイリアスは新規のみ作成）
 * - 新規: 新しいIDで挿入 + エイリアス作成
 * - 既存でnameJa未設定: 既存IDで更新（UPSERT）
 * - 既存でnameJa設定済み: スキップ
 */
async function batchInsertArtists(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
): Promise<void> {
	const artistsToUpsert: Array<{
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
		const cached = cache.artists.get(artistName);

		// 既存でnameJa設定済みならスキップ
		if (cached?.hasNameJa) {
			result.artists.skipped++;
			continue;
		}

		const initial = detectInitial(artistName);
		const nameInfo = generateNameInfo(artistName);
		// 既存の場合は既存IDを使用、新規の場合は新しいIDを生成
		const artistId = cached?.id ?? createId.artist();
		const isNew = !cached;

		artistsToUpsert.push({
			id: artistId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			initialScript: initial.initialScript,
			nameInitial: initial.nameInitial,
		});

		// エイリアスは新規アーティストの場合のみ作成
		if (isNew) {
			const aliasId = createId.artistAlias();
			newAliases.push({
				id: aliasId,
				artistId: artistId,
				name: nameInfo.name,
				aliasTypeCode: MAIN_ALIAS_TYPE_CODE,
				initialScript: initial.initialScript,
				nameInitial: initial.nameInitial,
			});
			// エイリアスIDをキャッシュ
			cache.artistAliases.set(artistName, aliasId);
		}

		// キャッシュを更新
		cache.artists.set(artistName, {
			id: artistId,
			hasNameJa: nameInfo.nameJa !== null,
		});
	}

	if (artistsToUpsert.length > 0) {
		await tx
			.insert(artists)
			.values(artistsToUpsert)
			.onConflictDoUpdate({
				target: artists.name,
				set: {
					nameJa: sql.raw(`excluded.${artists.nameJa.name}`),
					nameEn: sql.raw(`excluded.${artists.nameEn.name}`),
					initialScript: sql.raw(`excluded.${artists.initialScript.name}`),
					nameInitial: sql.raw(`excluded.${artists.nameInitial.name}`),
				},
			});
		result.artists.created += artistsToUpsert.length;
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
 * 新規作品を一括挿入（releaseCirclesも同時作成）
 * イベント日がある場合は頒布日をイベント日に設定
 */
async function batchInsertReleases(
	tx: DbTransaction,
	extracted: ExtractedEntities,
	cache: ImportCache,
	result: ImportResult,
	eventDayMappings?: Map<string, string>,
): Promise<void> {
	const newReleases: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		releaseType: string;
		eventId: string | null;
		eventDayId: string | null;
		releaseDate: string | null;
		releaseYear: number | null;
		releaseMonth: number | null;
		releaseDay: number | null;
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

		// イベント日を取得
		// 1. eventDayMappingsに指定があればそれを使用
		// 2. なければデフォルト（1日目）を使用
		let eventId: string | null = null;
		let eventDayId: string | null = null;
		let releaseDate: string | null = null;
		if (data.eventName) {
			eventId = cache.events.get(data.eventName) ?? null;
			// ユーザーが選択したイベント日があるかチェック
			const mappedEventDayId = eventDayMappings?.get(data.eventName);
			if (mappedEventDayId) {
				// 選択されたイベント日を使用
				eventDayId = mappedEventDayId;
				// 日付を取得
				const dayInfo = await tx
					.select({ date: eventDays.date })
					.from(eventDays)
					.where(eq(eventDays.id, mappedEventDayId))
					.limit(1);
				if (dayInfo.length > 0 && dayInfo[0]) {
					releaseDate = dayInfo[0].date;
				}
			} else {
				// デフォルト：キャッシュされた1日目を使用
				if (eventId) {
					const eventDayInfo = cache.eventDays.get(eventId);
					if (eventDayInfo) {
						eventDayId = eventDayInfo.id;
						releaseDate = eventDayInfo.date;
					}
				}
			}
		}

		// 頒布日から年/月/日を分解
		let releaseYear: number | null = null;
		let releaseMonth: number | null = null;
		let releaseDay: number | null = null;
		if (releaseDate) {
			const dateParts = releaseDate.split("-");
			if (dateParts.length >= 3) {
				releaseYear = Number.parseInt(dateParts[0] ?? "0", 10) || null;
				releaseMonth = Number.parseInt(dateParts[1] ?? "0", 10) || null;
				releaseDay = Number.parseInt(dateParts[2] ?? "0", 10) || null;
			}
		}

		newReleases.push({
			id: newId,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			releaseType: "album",
			eventId,
			eventDayId,
			releaseDate,
			releaseYear,
			releaseMonth,
			releaseDay,
		});

		// releaseCirclesを準備
		const isMultipleCircles = data.circleNames.length > 1;
		for (let i = 0; i < data.circleNames.length; i++) {
			const circleName = data.circleNames[i];
			if (!circleName) continue;

			const circleInfo = cache.circles.get(circleName);
			if (circleInfo) {
				newReleaseCircles.push({
					releaseId: newId,
					circleId: circleInfo.id,
					participationType: isMultipleCircles ? "co-host" : "host",
					position: i + 1,
				});
			}
		}

		cache.releases.set(releaseKey, {
			id: newId,
			eventId,
			eventDayId,
			releaseDate,
			releaseYear,
			releaseMonth,
			releaseDay,
		});
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
	const releaseIds = [
		...new Set([...cache.releases.values()].map((r) => r.id)),
	];
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
			for (const [releaseKey, releaseInfo] of cache.releases) {
				if (releaseInfo.id === d.releaseId) {
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

		const releaseInfo = cache.releases.get(data.releaseKey);
		if (!releaseInfo) continue;

		const newId = createId.disc();
		newDiscs.push({
			id: newId,
			releaseId: releaseInfo.id,
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
		eventId: string | null;
		eventDayId: string | null;
		releaseDate: string | null;
		releaseYear: number | null;
		releaseMonth: number | null;
		releaseDay: number | null;
	}> = [];

	for (const [trackKey, data] of extracted.trackData) {
		if (cache.tracks.has(trackKey)) {
			result.tracks.skipped++;
			continue;
		}

		const releaseInfo = cache.releases.get(data.releaseKey);
		const discId = cache.discs.get(data.discKey);
		if (!releaseInfo || !discId) continue;

		const nameInfo = generateNameInfo(data.record.title);
		const newId = createId.track();

		newTracks.push({
			id: newId,
			releaseId: releaseInfo.id,
			discId,
			trackNumber: data.trackNumber,
			name: nameInfo.name,
			nameJa: nameInfo.nameJa,
			nameEn: nameInfo.nameEn,
			eventId: releaseInfo.eventId,
			eventDayId: releaseInfo.eventDayId,
			releaseDate: releaseInfo.releaseDate,
			releaseYear: releaseInfo.releaseYear,
			releaseMonth: releaseInfo.releaseMonth,
			releaseDay: releaseInfo.releaseDay,
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
		artistAliasId: string | null;
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

			const artistInfo = cache.artists.get(artistName);
			if (!artistInfo) continue;
			const artistId = artistInfo.id;
			const artistAliasId = cache.artistAliases.get(artistName) || null;

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
					artistAliasId,
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

			const artistInfo = cache.artists.get(artistName);
			if (!artistInfo) continue;
			const artistId = artistInfo.id;
			const artistAliasId = cache.artistAliases.get(artistName) || null;

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
					artistAliasId,
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

			const artistInfo = cache.artists.get(artistName);
			if (!artistInfo) continue;
			const artistId = artistInfo.id;
			const artistAliasId = cache.artistAliases.get(artistName) || null;

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
					artistAliasId,
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
 * レガシーCSVデータをインポートする（バッチ処理版: ロック競合を軽減）
 *
 * 大量データのインポート時にPostgreSQLのロック競合を軽減するため、
 * 単一トランザクションではなくBATCH_SIZE件ごとのバッチトランザクションで処理する。
 *
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
		batchSummary: { totalBatches: 0, successfulBatches: 0, failedBatches: 0 },
	};

	const cache: ImportCache = {
		events: new Map(),
		eventDays: new Map(),
		circles: new Map(),
		artists: new Map(),
		artistAliases: new Map(),
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

	/**
	 * バッチ単位でトランザクションを実行するヘルパー
	 * 各バッチは個別のトランザクションで処理され、失敗してもエラーを記録して続行する
	 */
	async function executeBatch<T>(
		items: T[],
		entityName: string,
		processFn: (tx: DbTransaction, batchItems: T[]) => Promise<void>,
	): Promise<void> {
		const batches = chunk(items, BATCH_SIZE);
		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i];
			if (!batch || batch.length === 0) continue;

			result.batchSummary.totalBatches++;
			try {
				await db.transaction(async (tx) => {
					await processFn(tx, batch);
				});
				result.batchSummary.successfulBatches++;
			} catch (error) {
				result.batchSummary.failedBatches++;
				const message =
					error instanceof Error ? error.message : "Unknown error";
				result.errors.push({
					row: 0,
					entity: entityName,
					message: `バッチ ${i + 1}/${batches.length} 失敗: ${message}`,
				});
			}
		}
	}

	try {
		notifyProgress("preparing", 0, totalRecords, "データを解析中...");

		// Phase 1: 全レコードからユニークなエンティティを抽出（1パス）
		const extracted = extractUniqueEntities(input.records);

		// Phase 2: 既存エンティティを一括プリフェッチ（読み取り専用トランザクション）
		notifyProgress("preparing", 0, totalRecords, "既存データを確認中...");
		await db.transaction(async (tx) => {
			await prefetchExistingEntities(tx, extracted, cache);
		});

		// Phase 3: イベントを処理（通常は少数なので単一トランザクション）
		if (
			(input.newEvents && input.newEvents.length > 0) ||
			extracted.eventNames.size > 0
		) {
			notifyProgress(
				"events",
				0,
				entityProgress.events.total,
				"イベントを登録中...",
			);
			result.batchSummary.totalBatches++;
			try {
				await db.transaction(async (tx) => {
					// 新規イベント入力を処理
					if (input.newEvents && input.newEvents.length > 0) {
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
				});
				result.batchSummary.successfulBatches++;
			} catch (error) {
				result.batchSummary.failedBatches++;
				const message =
					error instanceof Error ? error.message : "Unknown error";
				result.errors.push({
					row: 0,
					entity: "events",
					message: `イベント登録バッチ失敗: ${message}`,
				});
			}
			notifyProgress(
				"events",
				entityProgress.events.processed,
				entityProgress.events.total,
				`イベント: ${entityProgress.events.processed}/${entityProgress.events.total}件`,
			);
		}

		// Phase 4: サークルをバッチ挿入
		notifyProgress(
			"circles",
			0,
			entityProgress.circles.total,
			"サークルを登録中...",
		);
		const circleNameList = [...extracted.circleNames];
		await executeBatch(circleNameList, "circles", async (tx, batchNames) => {
			// バッチ用の部分的なExtractedEntitiesを作成
			const batchExtracted: ExtractedEntities = {
				...extracted,
				circleNames: new Set(batchNames),
			};
			await batchInsertCircles(tx, batchExtracted, cache, result);
		});
		entityProgress.circles.processed = extracted.circleNames.size;
		notifyProgress(
			"circles",
			entityProgress.circles.processed,
			entityProgress.circles.total,
			`サークル: ${entityProgress.circles.processed}/${entityProgress.circles.total}件`,
		);

		// Phase 5: アーティストをバッチ挿入
		notifyProgress(
			"artists",
			0,
			entityProgress.artists.total,
			"アーティストを登録中...",
		);
		const artistNameList = [...extracted.artistNames];
		await executeBatch(artistNameList, "artists", async (tx, batchNames) => {
			const batchExtracted: ExtractedEntities = {
				...extracted,
				artistNames: new Set(batchNames),
			};
			await batchInsertArtists(tx, batchExtracted, cache, result);
		});
		entityProgress.artists.processed = extracted.artistNames.size;
		notifyProgress(
			"artists",
			entityProgress.artists.processed,
			entityProgress.artists.total,
			`アーティスト: ${entityProgress.artists.processed}/${entityProgress.artists.total}件`,
		);

		// Phase 6: 作品をバッチ挿入
		notifyProgress(
			"releases",
			0,
			entityProgress.releases.total,
			"作品を登録中...",
		);
		const releaseKeyList = [...extracted.releaseKeys.entries()];
		await executeBatch(releaseKeyList, "releases", async (tx, batchEntries) => {
			const batchExtracted: ExtractedEntities = {
				...extracted,
				releaseKeys: new Map(batchEntries),
			};
			await batchInsertReleases(
				tx,
				batchExtracted,
				cache,
				result,
				input.eventDayMappings,
			);
		});
		entityProgress.releases.processed = extracted.releaseKeys.size;
		notifyProgress(
			"releases",
			entityProgress.releases.processed,
			entityProgress.releases.total,
			`作品: ${entityProgress.releases.processed}/${entityProgress.releases.total}件`,
		);

		// Phase 7: ディスクをバッチ挿入
		notifyProgress(
			"tracks",
			0,
			entityProgress.tracks.total,
			"ディスクを登録中...",
		);
		const discKeyList = [...extracted.discKeys.entries()];
		await executeBatch(discKeyList, "discs", async (tx, batchEntries) => {
			const batchExtracted: ExtractedEntities = {
				...extracted,
				discKeys: new Map(batchEntries),
			};
			await batchInsertDiscs(tx, batchExtracted, cache, result);
		});

		// Phase 8: トラックをバッチ挿入
		notifyProgress(
			"tracks",
			0,
			entityProgress.tracks.total,
			"トラックを登録中...",
		);
		const trackDataList = [...extracted.trackData.entries()];
		await executeBatch(trackDataList, "tracks", async (tx, batchEntries) => {
			const batchExtracted: ExtractedEntities = {
				...extracted,
				trackData: new Map(batchEntries),
			};
			await batchInsertTracks(tx, batchExtracted, cache, result);
		});
		entityProgress.tracks.processed = extracted.trackData.size;
		notifyProgress(
			"tracks",
			entityProgress.tracks.processed,
			entityProgress.tracks.total,
			`トラック: ${entityProgress.tracks.processed}/${entityProgress.tracks.total}件`,
		);

		// Phase 9: クレジットをバッチ挿入
		notifyProgress("credits", 0, totalRecords, "クレジットを登録中...");
		const trackDataForCredits = [...extracted.trackData.entries()];
		await executeBatch(
			trackDataForCredits,
			"credits",
			async (tx, batchEntries) => {
				const batchExtracted: ExtractedEntities = {
					...extracted,
					trackData: new Map(batchEntries),
				};
				await batchInsertCredits(tx, batchExtracted, cache, result);
			},
		);
		notifyProgress("credits", totalRecords, totalRecords, "クレジット登録完了");

		// Phase 10: 原曲紐付けをバッチ挿入
		notifyProgress("links", 0, totalRecords, "原曲紐付けを登録中...");
		const trackDataForLinks = [...extracted.trackData.entries()];
		await executeBatch(
			trackDataForLinks,
			"officialSongLinks",
			async (tx, batchEntries) => {
				const batchExtracted: ExtractedEntities = {
					...extracted,
					trackData: new Map(batchEntries),
				};
				await batchInsertOfficialSongLinks(
					tx,
					batchExtracted,
					cache,
					input.songMappings,
					input.customSongNames,
					result,
				);
			},
		);
		notifyProgress("links", totalRecords, totalRecords, "原曲紐付け登録完了");

		notifyProgress("complete", totalRecords, totalRecords, "インポート完了");
	} catch (error) {
		result.success = false;
		const message = error instanceof Error ? error.message : "Unknown error";
		result.errors.push({
			row: 0,
			entity: "import",
			message: `インポートエラー: ${message}`,
		});
		notifyProgress("complete", 0, totalRecords, `エラー: ${message}`);
	}

	if (result.errors.length > 0) {
		result.success = false;
	}

	return result;
}

/**
 * イベントを処理（新規作成または既存イベントの設定更新）
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
		.select({
			id: events.id,
			startDate: events.startDate,
			totalDays: events.totalDays,
		})
		.from(events)
		.where(eq(events.name, eventName))
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		const existingEvent = existing[0];
		cache.events.set(eventName, existingEvent.id);

		// 既存イベントのevent_daysをチェック
		const existingDays = await tx
			.select({
				id: eventDays.id,
				dayNumber: eventDays.dayNumber,
				date: eventDays.date,
			})
			.from(eventDays)
			.where(eq(eventDays.eventId, existingEvent.id));

		const hasEventDays = existingDays.length > 0;
		const hasStartDate = !!existingEvent.startDate;

		// 既存の1日目をキャッシュに追加
		const existingDay1 = existingDays.find(
			(d: { id: string; dayNumber: number; date: string }) => d.dayNumber === 1,
		);
		if (existingDay1) {
			cache.eventDays.set(existingEvent.id, {
				id: existingDay1.id,
				date: existingDay1.date,
			});
		}

		// 設定が不完全な場合は更新
		if (!hasEventDays || !hasStartDate) {
			// イベントの日付情報を更新
			await tx
				.update(events)
				.set({
					totalDays: input.totalDays,
					startDate: input.startDate,
					endDate: input.endDate,
				})
				.where(eq(events.id, existingEvent.id));
			result.events.updated++;

			// 既存のdayNumberを取得
			const existingDayNumbers = new Set(
				existingDays.map((d: { dayNumber: number }) => d.dayNumber),
			);

			// 新しいevent_daysを追加（既存のものはスキップ）
			for (let i = 0; i < input.eventDates.length; i++) {
				const date = input.eventDates[i];
				const dayNumber = i + 1;
				if (!date) continue;

				if (!existingDayNumbers.has(dayNumber)) {
					const eventDayId = createId.eventDay();
					await tx
						.insert(eventDays)
						.values({
							id: eventDayId,
							eventId: existingEvent.id,
							dayNumber,
							date,
						})
						.onConflictDoNothing();
					result.eventDays.created++;

					// 1日目が新しく作成された場合はキャッシュに追加
					if (dayNumber === 1) {
						cache.eventDays.set(existingEvent.id, {
							id: eventDayId,
							date,
						});
					}
				}
			}
		}
		return;
	}

	// イベントシリーズを解決
	const editionInfo = parseEventEdition(eventName);
	let eventSeriesId: string | null = null;

	if (input.eventSeriesId) {
		// ユーザーが既存シリーズを明示的に選択
		eventSeriesId = input.eventSeriesId;
	} else if (input.eventSeriesName) {
		// ユーザーが新規シリーズ名を指定 → 同名チェック後に作成
		const trimmedName = input.eventSeriesName.trim();
		if (trimmedName) {
			const existingSeries = await tx
				.select({ id: eventSeries.id })
				.from(eventSeries)
				.where(eq(eventSeries.name, trimmedName))
				.limit(1);
			if (existingSeries.length > 0 && existingSeries[0]) {
				eventSeriesId = existingSeries[0].id;
			} else {
				const newSeriesId = createId.eventSeries();
				await tx.insert(eventSeries).values({
					id: newSeriesId,
					name: trimmedName,
				});
				eventSeriesId = newSeriesId;
			}
		}
	} else if (editionInfo.baseName) {
		// フォールバック: イベント名からLIKE検索で自動検出
		const series = await tx
			.select({ id: eventSeries.id })
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

		const eventDayId = createId.eventDay();
		const dayNumber = i + 1;
		await tx
			.insert(eventDays)
			.values({
				id: eventDayId,
				eventId: newEventId,
				dayNumber,
				date,
			})
			.onConflictDoNothing();
		result.eventDays.created++;

		// 1日目のイベント日をキャッシュに追加（作品の頒布日に使用）
		if (dayNumber === 1) {
			cache.eventDays.set(newEventId, {
				id: eventDayId,
				date,
			});
		}
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

/**
 * イベントの設定状態を詳細にチェック
 * 存在するが設定が不完全なイベントも検出する
 */
export async function checkEventsConfiguration(
	eventNames: string[],
): Promise<EventConfigurationStatus[]> {
	const results: EventConfigurationStatus[] = [];
	const uniqueNames = [
		...new Set(eventNames.map((n) => n.trim()).filter(Boolean)),
	];

	for (const eventName of uniqueNames) {
		// イベントを検索
		const existing = await db
			.select({
				id: events.id,
				name: events.name,
				startDate: events.startDate,
				totalDays: events.totalDays,
			})
			.from(events)
			.where(eq(events.name, eventName))
			.limit(1);

		if (existing.length === 0 || !existing[0]) {
			// イベントが存在しない
			results.push({
				name: eventName,
				exists: false,
				hasEventDays: false,
				eventDaysCount: 0,
				hasStartDate: false,
				hasTotalDays: false,
				needsConfiguration: true,
			});
		} else {
			// イベントが存在する場合、event_daysをチェック
			const event = existing[0];
			const days = await db
				.select({ id: eventDays.id })
				.from(eventDays)
				.where(eq(eventDays.eventId, event.id));

			const hasEventDays = days.length > 0;
			const hasStartDate = !!event.startDate;
			const hasTotalDays = !!event.totalDays;

			// 設定が必要: event_daysがないか、startDateがない場合
			const needsConfiguration = !hasEventDays || !hasStartDate;

			results.push({
				name: eventName,
				exists: true,
				eventId: event.id,
				hasEventDays,
				eventDaysCount: days.length,
				hasStartDate,
				hasTotalDays,
				needsConfiguration,
			});
		}
	}

	return results;
}

/**
 * 既存イベントにevent_daysと日付情報を設定
 */
export async function updateExistingEventConfiguration(
	eventId: string,
	input: NewEventInput,
): Promise<{ eventDaysCreated: number; eventUpdated: boolean }> {
	let eventDaysCreated = 0;
	let eventUpdated = false;

	await db.transaction(async (tx) => {
		// イベントの日付情報を更新
		await tx
			.update(events)
			.set({
				totalDays: input.totalDays,
				startDate: input.startDate,
				endDate: input.endDate,
			})
			.where(eq(events.id, eventId));
		eventUpdated = true;

		// 既存のevent_daysを取得
		const existingDays = await tx
			.select({ dayNumber: eventDays.dayNumber })
			.from(eventDays)
			.where(eq(eventDays.eventId, eventId));

		const existingDayNumbers = new Set(existingDays.map((d) => d.dayNumber));

		// 新しいevent_daysを追加（既存のものはスキップ）
		for (let i = 0; i < input.eventDates.length; i++) {
			const date = input.eventDates[i];
			const dayNumber = i + 1;
			if (!date) continue;

			if (!existingDayNumbers.has(dayNumber)) {
				await tx
					.insert(eventDays)
					.values({
						id: createId.eventDay(),
						eventId,
						dayNumber,
						date,
					})
					.onConflictDoNothing();
				eventDaysCreated++;
			}
		}
	});

	return { eventDaysCreated, eventUpdated };
}

/**
 * 既存イベントのうち、複数日を持つものを取得する
 * （イベント日選択が必要なイベントを特定するため）
 */
export async function getExistingEventsWithMultipleDays(
	eventNames: string[],
): Promise<ExistingEventWithDays[]> {
	const results: ExistingEventWithDays[] = [];
	const uniqueNames = [
		...new Set(eventNames.map((n) => n.trim()).filter(Boolean)),
	];

	for (const eventName of uniqueNames) {
		// イベントを検索
		const existing = await db
			.select({
				id: events.id,
				name: events.name,
			})
			.from(events)
			.where(eq(events.name, eventName))
			.limit(1);

		if (existing.length === 0 || !existing[0]) {
			continue; // イベントが存在しない場合はスキップ
		}

		const event = existing[0];

		// このイベントのイベント日を取得
		const days = await db
			.select({
				id: eventDays.id,
				dayNumber: eventDays.dayNumber,
				date: eventDays.date,
			})
			.from(eventDays)
			.where(eq(eventDays.eventId, event.id))
			.orderBy(eventDays.dayNumber);

		// 複数日を持つイベントのみ返す
		if (days.length > 1) {
			results.push({
				eventId: event.id,
				eventName: event.name,
				eventDays: days.map((d) => ({
					id: d.id,
					dayNumber: d.dayNumber,
					eventDate: d.date,
				})),
			});
		}
	}

	return results;
}
