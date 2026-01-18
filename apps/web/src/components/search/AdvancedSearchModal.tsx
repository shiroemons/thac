import { useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
	forwardRef,
	Suspense,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	OFFICIAL_WORK_CATEGORY_LABELS,
	OFFICIAL_WORK_CATEGORY_ORDER,
} from "@/lib/constants";
import {
	publicArtistsAllListOptions,
	publicCirclesAllListOptions,
	publicEventSeriesListOptions,
	publicEventsAllListOptions,
	publicSongsAllListOptions,
} from "@/lib/public-query-options";
import { ArtistRoleFilter } from "./ArtistRoleFilter";
import { CircleFilter } from "./CircleFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { EventFilter } from "./EventFilter";
import { FilterChips } from "./FilterChips";
import { FilterSection } from "./FilterSection";
import { OriginalSongCountFilter } from "./OriginalSongCountFilter";
import { OriginalSongFilter } from "./OriginalSongFilter";
import { RoleCountFilter } from "./RoleCountFilter";
import { SearchSyntaxHelp } from "./SearchSyntaxHelp";
import { TextSearchFilter } from "./TextSearchFilter";
import type {
	AdvancedSearchFilters,
	FilterChip,
	FilterSectionState,
} from "./types";
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

interface AdvancedSearchModalContentProps {
	filters: AdvancedSearchFilters;
	onFiltersChange: (filters: AdvancedSearchFilters) => void;
	chips: FilterChip[];
	onRemoveChip: (chip: FilterChip) => void;
	onClearAll: () => void;
}

/** スケルトンUI用のセクション識別子 */
const SKELETON_SECTIONS = [
	"text",
	"songs",
	"artists",
	"circles",
	"events",
] as const;

/** ローディング中のスケルトンUI */
function LoadingContent(): React.ReactNode {
	return (
		<div className="flex-1 divide-y divide-base-300 overflow-y-auto">
			{/* スケルトンセクション */}
			{SKELETON_SECTIONS.map((section) => (
				<div key={section} className="px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="skeleton h-5 w-32" />
						<div className="skeleton h-4 w-4 rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * 詳細検索モーダルのコンテンツ部分
 *
 * データ取得を含むため、Suspenseでラップして使用する
 */
function AdvancedSearchModalContent({
	filters,
	onFiltersChange,
	chips,
	onRemoveChip,
	onClearAll,
}: AdvancedSearchModalContentProps): React.ReactNode {
	// DBからマスターデータを取得
	const { data: artistsData } = useSuspenseQuery(publicArtistsAllListOptions());
	const { data: circlesData } = useSuspenseQuery(publicCirclesAllListOptions());
	const { data: eventSeriesData } = useSuspenseQuery(
		publicEventSeriesListOptions(),
	);
	const { data: eventsData } = useSuspenseQuery(publicEventsAllListOptions());
	const { data: songsData } = useSuspenseQuery(publicSongsAllListOptions());

	// セクション開閉状態
	const [sectionState, setSectionState] = useState<FilterSectionState>(
		DEFAULT_SECTION_STATE,
	);

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

	// カテゴリの表示順序（共通定数から生成）
	const categoryOrder = useMemo(
		() =>
			OFFICIAL_WORK_CATEGORY_ORDER.map(
				(key) => OFFICIAL_WORK_CATEGORY_LABELS[key],
			),
		[],
	);

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

	return (
		<>
			{/* フィルターチップエリア */}
			{chips.length > 0 && (
				<div className="border-base-300 border-b px-6 py-4">
					<FilterChips
						chips={chips}
						onRemove={onRemoveChip}
						onClearAll={onClearAll}
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
						options={originalSongs}
						categoryOrder={categoryOrder}
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
						onChange={(songCount) => onFiltersChange({ ...filters, songCount })}
					/>
				</FilterSection>

				{/* 頒布日フィルター */}
				<FilterSection
					title="頒布日"
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

				{/* 検索構文ヘルプ */}
				<SearchSyntaxHelp />
			</div>
		</>
	);
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

	// フィルターチップのロジックをフックから取得
	const { chips, handleRemoveChip, handleClearAll } = useFilterChips(
		filters,
		onFiltersChange,
	);

	useImperativeHandle(ref, () => ({
		showModal: () => dialogRef.current?.showModal(),
		close: () => dialogRef.current?.close(),
	}));

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
				<div className="flex items-center justify-between border-base-300 border-b px-6 py-4">
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

				{/* コンテンツ部分（Suspenseでラップ） */}
				<Suspense fallback={<LoadingContent />}>
					<AdvancedSearchModalContent
						filters={filters}
						onFiltersChange={onFiltersChange}
						chips={chips}
						onRemoveChip={handleRemoveChip}
						onClearAll={handleClearAll}
					/>
				</Suspense>

				{/* フッター（アクション） */}
				<div className="modal-action mt-0 justify-between border-base-300 border-t px-6 py-4">
					<button
						type="button"
						onClick={handleClearAll}
						className="btn btn-ghost btn-sm text-base-content/70"
						disabled={chips.length === 0}
					>
						リセット
					</button>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleClose}
							className="btn btn-ghost"
						>
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
			</div>

			{/* バックドロップ */}
			<form method="dialog" className="modal-backdrop">
				<button type="submit">close</button>
			</form>
		</dialog>
	);
});
