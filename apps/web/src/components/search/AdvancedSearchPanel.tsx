import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { OFFICIAL_WORK_CATEGORY_ORDER } from "@/lib/constants";
import {
	publicArtistsAllListOptions,
	publicCirclesAllListOptions,
	publicEventSeriesListOptions,
	publicEventsAllListOptions,
	publicSongsAllListOptions,
} from "@/lib/public-query-options";
import { cn } from "@/lib/utils";
import { ArtistRoleFilter } from "./ArtistRoleFilter";
import { CircleFilter } from "./CircleFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { EventFilter } from "./EventFilter";
import { createFilterChip, FilterChips } from "./FilterChips";
import { FilterSection } from "./FilterSection";
import { OriginalSongCountFilter } from "./OriginalSongCountFilter";
import { OriginalSongFilter } from "./OriginalSongFilter";
import { SearchSyntaxHelp } from "./SearchSyntaxHelp";
import type {
	AdvancedSearchFilters,
	FilterChip,
	FilterSectionState,
} from "./types";
import { DEFAULT_FILTERS, DEFAULT_SECTION_STATE, ROLE_LABELS } from "./types";

interface AdvancedSearchPanelProps {
	/** フィルター状態 */
	filters: AdvancedSearchFilters;
	/** フィルター変更ハンドラ */
	onFiltersChange: (filters: AdvancedSearchFilters) => void;
	/** パネルの表示状態 */
	isOpen: boolean;
	/** カスタムクラス名 */
	className?: string;
}

/**
 * 詳細検索パネル
 *
 * すべてのフィルターを統合したメインパネル
 * - フィルターチップ表示
 * - アコーディオンセクション
 * - 検索構文ヘルプ
 */
export function AdvancedSearchPanel({
	filters,
	onFiltersChange,
	isOpen,
	className,
}: AdvancedSearchPanelProps) {
	// DBからマスターデータを取得
	const { data: artistsData } = useSuspenseQuery(publicArtistsAllListOptions());
	const { data: circlesData } = useSuspenseQuery(publicCirclesAllListOptions());
	const { data: eventSeriesData } = useSuspenseQuery(
		publicEventSeriesListOptions(),
	);
	const { data: eventsData } = useSuspenseQuery(publicEventsAllListOptions());
	const { data: songsData } = useSuspenseQuery(publicSongsAllListOptions());

	// アーティストデータを変換
	const artists = useMemo(
		() =>
			artistsData.data.map((a) => ({
				id: a.id,
				name: a.name,
				nameJa: a.artistName !== a.name ? a.artistName : undefined,
			})),
		[artistsData],
	);

	// サークルデータを変換
	const circles = useMemo(
		() =>
			circlesData.data.map((c) => ({
				id: c.id,
				name: c.name,
				nameJa: c.nameJa || undefined,
			})),
		[circlesData],
	);

	// イベントシリーズデータを変換
	const eventSeries = useMemo(
		() =>
			eventSeriesData.data.map((es) => ({
				id: es.id,
				name: es.name,
			})),
		[eventSeriesData],
	);

	// イベントデータを変換
	const events = useMemo(
		() =>
			eventsData.data.map((e) => ({
				id: e.id,
				name: e.name,
				seriesId: e.eventSeriesId || "",
				seriesName: e.eventSeriesName || "",
				date: e.startDate?.substring(0, 7) || undefined, // YYYY-MM形式
			})),
		[eventsData],
	);

	// 原曲データをNestedOption形式に変換
	const originalSongs = useMemo(
		() =>
			songsData.data.map((s) => ({
				value: s.id,
				label: s.nameJa,
				category: s.workCategoryName || "その他",
				subgroup: s.workName || "作品なし",
			})),
		[songsData],
	);

	const [sectionState, setSectionState] = useState<FilterSectionState>(
		DEFAULT_SECTION_STATE,
	);

	// セクション開閉の切り替え
	const toggleSection = useCallback((key: keyof FilterSectionState) => {
		setSectionState((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	// フィルターチップの生成
	const chips = useMemo<FilterChip[]>(() => {
		const result: FilterChip[] = [];

		// 原曲
		for (const song of filters.originalSongs) {
			result.push(
				createFilterChip("originalSong", song.id, song.name, song.id),
			);
		}

		// サークル
		for (const circle of filters.circles) {
			result.push(
				createFilterChip("circle", circle.id, circle.name, circle.id),
			);
		}

		// アーティスト
		for (const artist of filters.artists) {
			result.push(
				createFilterChip(
					"artist",
					`${artist.role}-${artist.id}`,
					`${ROLE_LABELS[artist.role]}: ${artist.name}`,
					artist.id,
				),
			);
		}

		// 日付範囲
		if (filters.dateRange.from || filters.dateRange.to) {
			const from = filters.dateRange.from || "...";
			const to = filters.dateRange.to || "...";
			result.push(
				createFilterChip("date", "range", `${from} 〜 ${to}`, "date"),
			);
		}

		// イベント
		if (filters.event) {
			result.push(
				createFilterChip(
					"event",
					filters.event.id,
					filters.event.name,
					filters.event.id,
					filters.event.seriesName,
				),
			);
		}

		// 原曲数
		if (filters.songCount !== "any") {
			const label =
				typeof filters.songCount === "number"
					? `${filters.songCount}曲以上`
					: filters.songCount === "3+"
						? "3曲以上"
						: `${filters.songCount}曲`;
			result.push(
				createFilterChip("songCount", "count", label, filters.songCount),
			);
		}

		return result;
	}, [filters]);

	// チップ削除
	const handleRemoveChip = useCallback(
		(chip: FilterChip) => {
			switch (chip.type) {
				case "originalSong":
					onFiltersChange({
						...filters,
						originalSongs: filters.originalSongs.filter(
							(s) => s.id !== chip.value,
						),
					});
					break;
				case "circle":
					onFiltersChange({
						...filters,
						circles: filters.circles.filter((c) => c.id !== chip.value),
					});
					break;
				case "artist":
					onFiltersChange({
						...filters,
						artists: filters.artists.filter(
							(a) => `artist-${a.role}-${a.id}` !== chip.id,
						),
					});
					break;
				case "date":
					onFiltersChange({
						...filters,
						dateRange: {},
					});
					break;
				case "event":
					onFiltersChange({
						...filters,
						event: null,
					});
					break;
				case "songCount":
					onFiltersChange({
						...filters,
						songCount: "any",
					});
					break;
			}
		},
		[filters, onFiltersChange],
	);

	// すべてクリア
	const handleClearAll = useCallback(() => {
		onFiltersChange(DEFAULT_FILTERS);
	}, [onFiltersChange]);

	// 選択数の計算
	const originalSongCount = filters.originalSongs.length;
	const circleCount = filters.circles.length;
	const artistCount = filters.artists.length;
	const hasDateRange = !!filters.dateRange.from || !!filters.dateRange.to;
	const hasEvent = !!filters.event;
	const hasSongCount = filters.songCount !== "any";

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className={cn(
				"glass-card overflow-hidden rounded-xl border border-base-300",
				className,
			)}
		>
			{/* フィルターチップエリア */}
			{chips.length > 0 && (
				<div className="border-base-300 border-b p-3">
					<FilterChips
						chips={chips}
						onRemove={handleRemoveChip}
						onClearAll={handleClearAll}
					/>
				</div>
			)}

			{/* フィルターセクション */}
			<div className="divide-y divide-base-300">
				{/* 原曲フィルター */}
				<FilterSection
					title="原曲を選択"
					selectedCount={originalSongCount}
					isOpen={sectionState.originalSongs}
					onToggle={() => toggleSection("originalSongs")}
					onClear={() => onFiltersChange({ ...filters, originalSongs: [] })}
				>
					<OriginalSongFilter
						selectedSongs={filters.originalSongs}
						onChange={(songs) =>
							onFiltersChange({ ...filters, originalSongs: songs })
						}
						options={originalSongs}
						categoryOrder={OFFICIAL_WORK_CATEGORY_ORDER}
					/>
				</FilterSection>

				{/* 役割別アーティストフィルター */}
				<FilterSection
					title="役割別アーティスト"
					selectedCount={artistCount}
					isOpen={sectionState.artists}
					onToggle={() => toggleSection("artists")}
					onClear={() => onFiltersChange({ ...filters, artists: [] })}
				>
					<ArtistRoleFilter
						selectedArtists={filters.artists}
						onChange={(artists) => onFiltersChange({ ...filters, artists })}
						options={artists}
					/>
				</FilterSection>

				{/* サークルフィルター */}
				<FilterSection
					title="サークル"
					selectedCount={circleCount}
					isOpen={sectionState.circles}
					onToggle={() => toggleSection("circles")}
					onClear={() => onFiltersChange({ ...filters, circles: [] })}
				>
					<CircleFilter
						selectedCircles={filters.circles}
						onChange={(circles) => onFiltersChange({ ...filters, circles })}
						options={circles}
					/>
				</FilterSection>

				{/* リリース日フィルター */}
				<FilterSection
					title="リリース日"
					selectedCount={hasDateRange ? 1 : 0}
					isOpen={sectionState.dateRange}
					onToggle={() => toggleSection("dateRange")}
					onClear={() => onFiltersChange({ ...filters, dateRange: {} })}
				>
					<DateRangeFilter
						dateRange={filters.dateRange}
						onChange={(dateRange) => onFiltersChange({ ...filters, dateRange })}
					/>
				</FilterSection>

				{/* イベントフィルター */}
				<FilterSection
					title="イベント"
					selectedCount={hasEvent ? 1 : 0}
					isOpen={sectionState.event}
					onToggle={() => toggleSection("event")}
					onClear={() => onFiltersChange({ ...filters, event: null })}
				>
					<EventFilter
						selectedEvent={filters.event}
						onChange={(event) => onFiltersChange({ ...filters, event })}
						eventSeries={eventSeries}
						events={events}
					/>
				</FilterSection>

				{/* 原曲数フィルター */}
				<FilterSection
					title="原曲数"
					selectedCount={hasSongCount ? 1 : 0}
					isOpen={sectionState.songCount}
					onToggle={() => toggleSection("songCount")}
					onClear={() => onFiltersChange({ ...filters, songCount: "any" })}
				>
					<OriginalSongCountFilter
						value={filters.songCount}
						onChange={(songCount) => onFiltersChange({ ...filters, songCount })}
					/>
				</FilterSection>
			</div>

			{/* 検索構文ヘルプ */}
			<SearchSyntaxHelp />
		</div>
	);
}
