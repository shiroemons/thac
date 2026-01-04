import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArtistRoleFilter } from "./ArtistRoleFilter";
import { CircleFilter } from "./CircleFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { EventFilter } from "./EventFilter";
import { createFilterChip, FilterChips } from "./FilterChips";
import { FilterSection } from "./FilterSection";
import {
	mockArtists,
	mockCircles,
	mockEventSeries,
	mockEvents,
	mockOriginalSongs,
	originalSongCategoryOrder,
} from "./mock-data";
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
						options={mockOriginalSongs}
						categoryOrder={originalSongCategoryOrder}
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
						options={mockArtists}
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
						options={mockCircles}
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
						eventSeries={mockEventSeries}
						events={mockEvents}
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
