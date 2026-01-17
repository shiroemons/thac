"use client";

import type { BarCustomLayerProps, BarDatum } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	ArrowUpDown,
	BarChart3,
	BarChartHorizontal,
	Layers,
	Loader2,
	SortAsc,
	SortDesc,
} from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { StackedWorkStat, WorkStat } from "@/lib/public-api";
import {
	publicSongStatsQueryOptions,
	publicWorkStatsSimpleQueryOptions,
	publicWorkStatsStackedQueryOptions,
	type StatsEntityType,
} from "@/lib/public-query-options";
import {
	type ChartData,
	type ChartOrientation,
	type SortOrder,
	transformSimpleDataForNivo,
	transformSongsDataForNivo,
	transformStackedDataForNivo,
} from "@/lib/transformers/chart-data";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { WorkStatsSkeleton } from "./work-stats-skeleton";

// SSR対応: @nivo/barを動的インポート
const ResponsiveBar = lazy(() =>
	import("@nivo/bar").then((m) => ({ default: m.ResponsiveBar })),
);

// StatsEntityTypeはpublic-query-options.tsから再エクスポート
export type { StatsEntityType } from "@/lib/public-query-options";

// 積み上げバーの総計を表示するカスタムレイヤー
function TotalsLayer({
	bars,
	xScale,
	yScale,
	innerWidth,
	labelTextColor,
	orientation = "horizontal",
}: BarCustomLayerProps<BarDatum> & {
	labelTextColor?: string;
	orientation?: ChartOrientation;
}) {
	// indexValue（workName）ごとにバーをグループ化
	const barsByIndex = new Map<
		string | number,
		{
			maxX: number;
			maxY: number;
			minY: number;
			x: number;
			y: number;
			width: number;
			height: number;
			total: number;
		}
	>();

	for (const bar of bars) {
		const indexValue = bar.data.indexValue;
		const rightEdge = bar.x + bar.width;
		const topEdge = bar.y;
		const total = (bar.data.data.totalTrackCount as number) || 0;

		const existing = barsByIndex.get(indexValue);
		if (orientation === "horizontal") {
			if (!existing || rightEdge > existing.maxX) {
				barsByIndex.set(indexValue, {
					maxX: rightEdge,
					maxY: 0,
					minY: bar.y,
					x: bar.x,
					y: bar.y,
					width: bar.width,
					height: bar.height,
					total,
				});
			}
		} else {
			// 縦グラフの場合、最も上（Y座標が小さい）のバーを追跡
			if (!existing || topEdge < existing.minY) {
				barsByIndex.set(indexValue, {
					maxX: rightEdge,
					maxY: bar.y + bar.height,
					minY: topEdge,
					x: bar.x,
					y: bar.y,
					width: bar.width,
					height: bar.height,
					total,
				});
			}
		}
	}

	return (
		<g>
			{Array.from(barsByIndex.entries()).map(
				([indexValue, { maxX, minY, x, y, width, height, total }]) => {
					if (orientation === "horizontal") {
						// 右端がチャート領域外に出ないよう調整
						const textX = Math.min(maxX + 8, innerWidth - 40);
						// xScaleから0の位置を取得（バーの開始位置）
						const zeroX = xScale(0);
						// バーの長さが0の場合は0の位置から表示
						const displayX = maxX <= zeroX ? zeroX + 8 : textX;

						return (
							<text
								key={String(indexValue)}
								x={displayX}
								y={y + height / 2}
								textAnchor="start"
								dominantBaseline="central"
								style={{
									fontSize: 12,
									fontWeight: 500,
									fill: labelTextColor || "#374151",
								}}
							>
								計 {total}
							</text>
						);
					}
					// 縦グラフの場合、バーの上に表示
					const zeroY = yScale(0);
					const displayY = minY >= zeroY ? zeroY - 8 : minY - 8;

					return (
						<text
							key={String(indexValue)}
							x={x + width / 2}
							y={displayY}
							textAnchor="middle"
							dominantBaseline="auto"
							style={{
								fontSize: 10,
								fontWeight: 500,
								fill: labelTextColor || "#374151",
							}}
						>
							{total}
						</text>
					);
				},
			)}
		</g>
	);
}

// ダークモード検出フック
function useIsDarkMode(): boolean {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const checkTheme = () => {
			const theme = document.documentElement.getAttribute("data-theme");
			setIsDark(theme === "dark");
		};
		checkTheme();

		const observer = new MutationObserver(checkTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});

		return () => observer.disconnect();
	}, []);

	return isDark;
}

// モバイル検出フック
function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return isMobile;
}

const SORT_ORDER_STORAGE_KEY = "work-stats-sort-order";
const ORIENTATION_STORAGE_KEY = "work-stats-chart-orientation";

interface WorkStatsSectionProps {
	entityType: StatsEntityType;
	entityId: string;
}

export function WorkStatsSection({
	entityType,
	entityId,
}: WorkStatsSectionProps) {
	const isDarkMode = useIsDarkMode();
	const isMobile = useIsMobile();

	// UI状態
	const [isStacked, setIsStacked] = useState(true);
	const [orientation, setOrientation] =
		useState<ChartOrientation>("horizontal");
	const [sortOrder, setSortOrder] = useState<SortOrder>("id");

	// ドリルダウン用状態
	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [selectedWorkName, setSelectedWorkName] = useState<string>("");

	// クライアントサイドでlocalStorageから読み込み
	useEffect(() => {
		const saved = localStorage.getItem(SORT_ORDER_STORAGE_KEY);
		if (saved === "count-desc" || saved === "count-asc" || saved === "id") {
			setSortOrder(saved);
		}
	}, []);

	// 向き設定をlocalStorageから読み込み
	useEffect(() => {
		const saved = localStorage.getItem(ORIENTATION_STORAGE_KEY);
		if (saved === "horizontal" || saved === "vertical") {
			setOrientation(saved);
		}
	}, []);

	// 実際に使う向き（モバイルは常に横）
	const effectiveOrientation = isMobile ? "horizontal" : orientation;
	// 実際に使う表示モード（モバイルは常に単純）
	const effectiveIsStacked = isMobile ? false : isStacked;

	// selectでチャートデータに変換（useCallbackでメモ化）
	const selectStackedChartData = useCallback(
		(response: { works: StackedWorkStat[] } | undefined): ChartData | null =>
			response?.works && response.works.length > 0
				? transformStackedDataForNivo(
						response.works,
						sortOrder,
						effectiveOrientation,
					)
				: null,
		[sortOrder, effectiveOrientation],
	);

	const selectSimpleChartData = useCallback(
		(response: { works: WorkStat[] } | undefined): ChartData | null =>
			response?.works && response.works.length > 0
				? transformSimpleDataForNivo(
						response.works,
						sortOrder,
						effectiveOrientation,
					)
				: null,
		[sortOrder, effectiveOrientation],
	);

	const selectSongsChartData = useCallback(
		(
			response:
				| { songs: { id: string; name: string | null; trackCount: number }[] }
				| undefined,
		): ChartData | null =>
			response?.songs && response.songs.length > 0
				? transformSongsDataForNivo(
						response.songs,
						sortOrder,
						effectiveOrientation,
					)
				: null,
		[sortOrder, effectiveOrientation],
	);

	// TanStack Query: 積み上げチャートデータ（デスクトップ用、selectで変換）
	const {
		data: stackedChartData,
		isPending: isStackedPending,
		error: stackedError,
	} = useQuery({
		...publicWorkStatsStackedQueryOptions(entityType, entityId),
		enabled: !isMobile,
		select: selectStackedChartData,
	});

	// TanStack Query: シンプルチャートデータ（モバイル or シンプルモード用、selectで変換）
	const {
		data: simpleChartData,
		isPending: isSimplePending,
		error: simpleError,
	} = useQuery({
		...publicWorkStatsSimpleQueryOptions(entityType, entityId),
		enabled: isMobile || !isStacked,
		select: selectSimpleChartData,
	});

	// TanStack Query: ドリルダウン用原曲チャートデータ（selectで変換）
	const { data: songsChartData, isFetching: isSongsFetching } = useQuery({
		...publicSongStatsQueryOptions(entityType, entityId, selectedWorkId ?? ""),
		enabled: !!selectedWorkId,
		select: selectSongsChartData,
	});

	// ローディング・エラー状態の判定
	const isInitialLoading = effectiveIsStacked
		? isStackedPending && !stackedChartData
		: isSimplePending && !simpleChartData;
	const isUpdating = isSongsFetching;
	const error =
		stackedError || simpleError ? "統計データの取得に失敗しました" : null;

	// エンティティ変更時にドリルダウン状態をリセット
	// biome-ignore lint/correctness/useExhaustiveDependencies: entityId変更時にステートリセットが必要
	useEffect(() => {
		setSelectedWorkId(null);
		setSelectedWorkName("");
		setIsStacked(true);
	}, [entityId]);

	// sortOrder変更を処理する関数（localStorageへの保存を含む）
	const handleSortOrderChange = useCallback((newOrder: SortOrder) => {
		setSortOrder(newOrder);
		localStorage.setItem(SORT_ORDER_STORAGE_KEY, newOrder);
	}, []);

	// サイクルボタン: id → count-desc → count-asc → id
	const cycleSortOrder = useCallback(() => {
		const nextOrder: SortOrder =
			sortOrder === "id"
				? "count-desc"
				: sortOrder === "count-desc"
					? "count-asc"
					: "id";
		handleSortOrderChange(nextOrder);
	}, [sortOrder, handleSortOrderChange]);

	// 向き変更
	const handleOrientationChange = useCallback(
		(newOrientation: ChartOrientation) => {
			setOrientation(newOrientation);
			localStorage.setItem(ORIENTATION_STORAGE_KEY, newOrientation);
		},
		[],
	);

	// モード切替
	const handleModeToggle = useCallback(() => {
		setSelectedWorkId(null);
		setSelectedWorkName("");
		setIsStacked((prev) => !prev);
	}, []);

	// ドリルダウン戻る
	const handleBack = useCallback(() => {
		setSelectedWorkId(null);
		setSelectedWorkName("");
	}, []);

	// バークリックハンドラ（ドリルダウン）
	const handleBarClick = useCallback((bar: BarDatum) => {
		const workId = bar.workId as string;
		const workName = bar.workName as string;
		if (workId) {
			setSelectedWorkId(workId);
			setSelectedWorkName(workName);
		}
	}, []);

	// Nivoテーマ
	const nivoTheme = useMemo(
		() => ({
			text: {
				fill: isDarkMode ? "#e5e7eb" : "#374151",
			},
			axis: {
				ticks: {
					text: {
						fill: isDarkMode ? "#e5e7eb" : "#374151",
					},
				},
			},
			grid: {
				line: {
					stroke: isDarkMode ? "#4b5563" : "#e5e7eb",
				},
			},
			tooltip: {
				container: {
					background: isDarkMode ? "#1f2937" : "#ffffff",
					color: isDarkMode ? "#e5e7eb" : "#374151",
				},
			},
		}),
		[isDarkMode],
	);

	// チャートデータ選択（selectで変換済みのデータから条件分岐で選択）
	const chartData = useMemo((): ChartData | null => {
		// ドリルダウン表示中
		if (selectedWorkId && songsChartData) {
			return songsChartData;
		}

		// 積み上げモード
		if (effectiveIsStacked && stackedChartData) {
			return stackedChartData;
		}

		// 単純モード
		if (!effectiveIsStacked && simpleChartData) {
			return simpleChartData;
		}

		return null;
	}, [
		selectedWorkId,
		songsChartData,
		effectiveIsStacked,
		stackedChartData,
		simpleChartData,
	]);

	// 初回ローディング
	if (isInitialLoading) {
		return <WorkStatsSkeleton />;
	}

	// エラー表示
	if (error) {
		return (
			<Card className="p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-error/10">
					<BarChart3 className="size-8 text-error" />
				</div>
				<p className="text-error">{error}</p>
			</Card>
		);
	}

	// データなし
	if (!chartData || chartData.data.length === 0) {
		return (
			<Card className="p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-base-200">
					<BarChart3 className="size-8 text-base-content/60" />
				</div>
				<p className="text-base-content/70">統計データがありません</p>
			</Card>
		);
	}

	// 横グラフは行数に応じた高さ、縦グラフは固定高さ
	const chartHeight =
		effectiveOrientation === "horizontal"
			? Math.max(300, chartData.data.length * 40)
			: 600;

	return (
		<div className="space-y-4">
			{/* ヘッダー: タイトル + コントロール */}
			<Card className="space-y-6 border-2 border-base-content/20 p-6 shadow-sm">
				{/* タイトル行 */}
				{selectedWorkId ? (
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" onClick={handleBack}>
							<ArrowLeft className="size-4" />
							戻る
						</Button>
						<div>
							<span className="font-medium text-primary">
								{selectedWorkName}
							</span>
							<span className="text-base-content/70">の原曲別トラック数</span>
						</div>
					</div>
				) : (
					<div className="mb-10 flex items-center justify-between">
						<h3 className="font-bold text-base-content text-lg">原作/原曲</h3>
						{/* モバイル: 並び替えボタンをタイトル行に配置 */}
						<Button
							variant={sortOrder === "id" ? "outline" : "secondary"}
							size="sm"
							onClick={cycleSortOrder}
							className="md:hidden"
						>
							{sortOrder === "id" && (
								<>
									<ArrowUpDown className="size-4" />
									並び替え
								</>
							)}
							{sortOrder === "count-desc" && (
								<>
									<SortDesc className="size-4" />
									トラック数 ↓
								</>
							)}
							{sortOrder === "count-asc" && (
								<>
									<SortAsc className="size-4" />
									トラック数 ↑
								</>
							)}
						</Button>
					</div>
				)}

				{/* コントロール行: 左=並び替え、中央=表示モード、右=向き - デスクトップのみ */}
				<div className="hidden items-center justify-between md:flex">
					{/* 左: 並び替えボタン */}
					<Button
						variant={sortOrder === "id" ? "outline" : "secondary"}
						size="sm"
						onClick={cycleSortOrder}
					>
						{sortOrder === "id" && (
							<>
								<ArrowUpDown className="size-4" />
								並び替え
							</>
						)}
						{sortOrder === "count-desc" && (
							<>
								<SortDesc className="size-4" />
								トラック数 ↓
							</>
						)}
						{sortOrder === "count-asc" && (
							<>
								<SortAsc className="size-4" />
								トラック数 ↑
							</>
						)}
					</Button>

					{/* 中央: 表示モード切替 - デスクトップのみ、ドリルダウン時は非表示 */}
					{!selectedWorkId ? (
						<div className="hidden items-center gap-2 md:flex">
							<div className="join">
								<Button
									variant={isStacked ? "primary" : "ghost"}
									size="sm"
									onClick={() => !isStacked && handleModeToggle()}
									disabled={isUpdating}
									className="join-item"
								>
									<Layers className="size-4" />
									積み上げ
								</Button>
								<Button
									variant={!isStacked ? "primary" : "ghost"}
									size="sm"
									onClick={() => isStacked && handleModeToggle()}
									disabled={isUpdating}
									className="join-item"
								>
									{effectiveOrientation === "horizontal" ? (
										<BarChartHorizontal className="size-4" />
									) : (
										<BarChart3 className="size-4" />
									)}
									単純
								</Button>
							</div>
							{isUpdating && (
								<Loader2 className="size-4 animate-spin text-primary" />
							)}
						</div>
					) : (
						<div className="hidden md:block" />
					)}

					{/* 右: 向き切り替えボタン - デスクトップのみ */}
					<div className="join hidden md:flex">
						<Button
							variant={
								effectiveOrientation === "vertical" ? "primary" : "ghost"
							}
							size="icon"
							onClick={() => handleOrientationChange("vertical")}
							title="縦グラフ"
							className="join-item"
						>
							<BarChart3 className="size-4" />
						</Button>
						<Button
							variant={
								effectiveOrientation === "horizontal" ? "primary" : "ghost"
							}
							size="icon"
							onClick={() => handleOrientationChange("horizontal")}
							title="横グラフ"
							className="join-item"
						>
							<BarChartHorizontal className="size-4" />
						</Button>
					</div>
				</div>

				{/* チャート */}
				<div style={{ height: chartHeight }}>
					<Suspense
						fallback={
							<div className="flex h-full items-center justify-center">
								<Loader2 className="size-8 animate-spin text-primary" />
							</div>
						}
					>
						<ResponsiveBar
							data={chartData.data}
							keys={chartData.keys}
							indexBy={chartData.indexBy}
							layout={effectiveOrientation}
							groupMode={chartData.isStacked ? "stacked" : "grouped"}
							colors={chartData.colors}
							margin={
								effectiveOrientation === "horizontal"
									? { top: 10, right: 10, bottom: 30, left: 90 }
									: { top: 10, right: 20, bottom: 80, left: 60 }
							}
							padding={0.3}
							valueScale={{ type: "linear" }}
							indexScale={{ type: "band", round: true }}
							borderRadius={chartData.isStacked ? 0 : 4}
							layers={
								chartData.isStacked
									? [
											"grid",
											"axes",
											"bars",
											"markers",
											"legends",
											(props) => (
												<TotalsLayer
													{...props}
													labelTextColor={isDarkMode ? "#e5e7eb" : "#374151"}
													orientation={effectiveOrientation}
												/>
											),
										]
									: ["grid", "axes", "bars", "markers", "legends"]
							}
							enableLabel
							label={(d) => (d.value && d.value > 0 ? `${d.value}` : "")}
							labelSkipWidth={effectiveOrientation === "horizontal" ? 20 : 0}
							labelSkipHeight={effectiveOrientation === "vertical" ? 12 : 0}
							labelTextColor="#ffffff"
							axisTop={null}
							axisRight={null}
							axisBottom={
								effectiveOrientation === "horizontal"
									? {
											tickSize: 5,
											tickPadding: 5,
											tickRotation: 0,
										}
									: {
											tickSize: 5,
											tickPadding: 5,
											tickRotation: -45,
											truncateTickAt: 8,
										}
							}
							axisLeft={{
								tickSize: 5,
								tickPadding: 5,
								tickRotation: 0,
								truncateTickAt: effectiveOrientation === "horizontal" ? 7 : 0,
							}}
							theme={nivoTheme}
							onClick={(bar) => {
								if (!selectedWorkId) {
									handleBarClick(bar.data);
								}
							}}
							tooltip={({ id, value, indexValue, data }) => (
								<div
									className="rounded bg-base-100 px-3 py-2 shadow-lg"
									style={{
										whiteSpace: "nowrap",
										writingMode: "horizontal-tb",
									}}
								>
									<strong>{indexValue}</strong>
									{chartData.isStacked && (
										<span className="ml-2 text-sm">({id})</span>
									)}
									<span className="ml-2">{value}曲</span>
									{chartData.isStacked && data.totalTrackCount && (
										<span className="ml-2 text-xs opacity-70">
											/ 計{data.totalTrackCount}曲
										</span>
									)}
								</div>
							)}
						/>
					</Suspense>
				</div>
			</Card>
		</div>
	);
}
