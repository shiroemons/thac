import { X } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { ArtistRoleFilter } from "./ArtistRoleFilter";
import { CircleFilter } from "./CircleFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { EventFilter } from "./EventFilter";
import { FilterChips } from "./FilterChips";
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
import { RoleCountFilter } from "./RoleCountFilter";
import { SearchSyntaxHelp } from "./SearchSyntaxHelp";
import { TextSearchFilter } from "./TextSearchFilter";
import type { AdvancedSearchFilters, FilterSectionState } from "./types";
import {
	DEFAULT_ROLE_COUNTS,
	DEFAULT_SECTION_STATE,
	DEFAULT_TEXT_SEARCH,
} from "./types";
import { useFilterChips } from "./useFilterChips";

export interface AdvancedSearchModalRef {
	showModal: () => void;
	close: () => void;
}

interface AdvancedSearchModalProps {
	/** フィルター状態 */
	filters: AdvancedSearchFilters;
	/** フィルター変更ハンドラ */
	onFiltersChange: (filters: AdvancedSearchFilters) => void;
	/** 検索実行ハンドラ */
	onSearch: () => void;
}

/**
 * 詳細検索モーダル
 *
 * すべてのフィルターを統合したモーダルダイアログ
 * - フィルターチップ表示
 * - アコーディオンセクション
 * - 検索構文ヘルプ
 */
export const AdvancedSearchModal = forwardRef<
	AdvancedSearchModalRef,
	AdvancedSearchModalProps
>(function AdvancedSearchModal({ filters, onFiltersChange, onSearch }, ref) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [sectionState, setSectionState] = useState<FilterSectionState>(
		DEFAULT_SECTION_STATE,
	);

	// フィルターチップのロジックをフックから取得
	const { chips, handleRemoveChip, handleClearAll } = useFilterChips(
		filters,
		onFiltersChange,
	);

	useImperativeHandle(ref, () => ({
		showModal: () => dialogRef.current?.showModal(),
		close: () => dialogRef.current?.close(),
	}));

	// セクション開閉の切り替え
	const toggleSection = useCallback((key: keyof FilterSectionState) => {
		setSectionState((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	// 選択数の計算
	const textSearchCount = Object.values(filters.textSearch).filter(
		Boolean,
	).length;
	const originalSongCount = filters.originalSongs.length;
	const artistCount = filters.artists.length;
	const circleCount = filters.circles.length;
	const roleCountCount = Object.values(filters.roleCounts).filter(
		(v) => v !== "any",
	).length;
	const hasSongCount = filters.songCount !== "any";
	const hasDateRange = !!filters.dateRange.from || !!filters.dateRange.to;
	const hasEvent = !!filters.event;

	// 検索実行
	const handleSearch = () => {
		onSearch();
		dialogRef.current?.close();
	};

	// 閉じる
	const handleClose = () => {
		dialogRef.current?.close();
	};

	return (
		<dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
			<div className="modal-box flex max-h-[90vh] max-w-4xl flex-col p-0">
				{/* ヘッダー */}
				<div className="flex items-center justify-between border-base-300 border-b px-4 py-3">
					<h3 className="font-bold text-lg">詳細検索</h3>
					<button
						type="button"
						onClick={handleClose}
						className="btn btn-ghost btn-sm btn-circle"
						aria-label="閉じる"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* フィルターチップエリア */}
				{chips.length > 0 && (
					<div className="border-base-300 border-b px-4 py-3">
						<FilterChips
							chips={chips}
							onRemove={handleRemoveChip}
							onClearAll={handleClearAll}
						/>
					</div>
				)}

				{/* スクロール可能なコンテンツ */}
				<div className="flex-1 divide-y divide-base-300 overflow-y-auto">
					{/* テキスト検索 */}
					<FilterSection
						title="テキスト検索"
						selectedCount={textSearchCount}
						isOpen={sectionState.textSearch}
						onToggle={() => toggleSection("textSearch")}
						onClear={() =>
							onFiltersChange({
								...filters,
								textSearch: DEFAULT_TEXT_SEARCH,
							})
						}
					>
						<TextSearchFilter
							value={filters.textSearch}
							onChange={(textSearch) =>
								onFiltersChange({ ...filters, textSearch })
							}
						/>
					</FilterSection>

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

					{/* 役割者数フィルター */}
					<FilterSection
						title="役割者数"
						selectedCount={roleCountCount}
						isOpen={sectionState.roleCounts}
						onToggle={() => toggleSection("roleCounts")}
						onClear={() =>
							onFiltersChange({
								...filters,
								roleCounts: DEFAULT_ROLE_COUNTS,
							})
						}
					>
						<RoleCountFilter
							value={filters.roleCounts}
							onChange={(roleCounts) =>
								onFiltersChange({ ...filters, roleCounts })
							}
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
							onChange={(songCount) =>
								onFiltersChange({ ...filters, songCount })
							}
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
							onChange={(dateRange) =>
								onFiltersChange({ ...filters, dateRange })
							}
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

					{/* 検索構文ヘルプ */}
					<SearchSyntaxHelp />
				</div>

				{/* フッター（アクション） */}
				<div className="modal-action mt-0 border-base-300 border-t px-4 py-3">
					<button type="button" onClick={handleClose} className="btn btn-ghost">
						閉じる
					</button>
					<button
						type="button"
						onClick={handleSearch}
						className="btn btn-primary"
					>
						検索
					</button>
				</div>
			</div>

			{/* バックドロップ */}
			<form method="dialog" className="modal-backdrop">
				<button type="submit">close</button>
			</form>
		</dialog>
	);
});
