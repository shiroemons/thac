"use client";

import type { BarCustomLayerProps, BarDatum } from "@nivo/bar";
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
import {
	publicApi,
	type SongStatsResponse,
	type StackedWorkStat,
	type StackedWorkStatsResponse,
	type WorkStat,
	type WorkStatsResponse,
} from "@/lib/public-api";
import { WorkStatsSkeleton } from "./work-stats-skeleton";

// SSR対応: @nivo/barを動的インポート
const ResponsiveBar = lazy(() =>
	import("@nivo/bar").then((m) => ({ default: m.ResponsiveBar })),
);

export type StatsEntityType = "circle" | "artist" | "event";

// チャート用の色パレット（区別しやすい8色）
const CHART_COLORS = [
	"#3b82f6", // blue
	"#ef4444", // red
	"#22c55e", // green
	"#f59e0b", // amber
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#f97316", // orange
];

// 文字列からハッシュ値を生成（項目ベースの色割り当て用）
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

// 項目IDから一貫した色を取得
function getColorForItem(id: string): string {
	const index = hashString(id) % CHART_COLORS.length;
	return CHART_COLORS[index];
}

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

type SortOrder = "count-desc" | "count-asc" | "id";
type ChartOrientation = "horizontal" | "vertical";

const SORT_ORDER_STORAGE_KEY = "work-stats-sort-order";
const ORIENTATION_STORAGE_KEY = "work-stats-chart-orientation";

// Nivo用データ形式に変換（積み上げモード）
function transformStackedDataForNivo(
	stackedData: StackedWorkStat[],
	sortOrder: SortOrder,
	orientation: ChartOrientation,
): { data: BarDatum[]; keys: string[]; colors: Record<string, string> } {
	if (stackedData.length === 0) {
		return { data: [], keys: [], colors: {} };
	}

	// ソート
	// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
	// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
	let sorted: StackedWorkStat[];
	if (orientation === "horizontal") {
		if (sortOrder === "id") {
			sorted = [...stackedData].sort((a, b) => b.id.localeCompare(a.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...stackedData].sort(
				(a, b) => b.totalTrackCount - a.totalTrackCount,
			);
		} else {
			sorted = [...stackedData].sort(
				(a, b) => a.totalTrackCount - b.totalTrackCount,
			);
		}
	} else {
		// 縦グラフ: 通常の順序
		if (sortOrder === "id") {
			sorted = [...stackedData].sort((a, b) => a.id.localeCompare(b.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...stackedData].sort(
				(a, b) => a.totalTrackCount - b.totalTrackCount,
			);
		} else {
			sorted = [...stackedData].sort(
				(a, b) => b.totalTrackCount - a.totalTrackCount,
			);
		}
	}

	// 各ワーク内の曲をID順にソート
	for (const work of sorted) {
		work.songs.sort((a, b) => a.id.localeCompare(b.id));
	}

	// 全曲のユニークキーを収集（ID順でソート済み）
	const songKeysMap = new Map<string, { id: string; name: string }>();
	const colors: Record<string, string> = {};
	for (const work of sorted) {
		for (const song of work.songs) {
			const key = song.name ?? "不明";
			if (!songKeysMap.has(key)) {
				songKeysMap.set(key, { id: song.id, name: key });
			}
			if (!colors[key]) {
				colors[key] = getColorForItem(song.id);
			}
		}
	}
	// ID順でキーをソート
	const keys = Array.from(songKeysMap.values())
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((item) => item.name);

	// Nivo BarDatum形式に変換（totalTrackCountを含める）
	const data: BarDatum[] = sorted.map((work) => {
		const datum: BarDatum = {
			workId: work.id,
			workName: work.shortName ?? work.name ?? "不明",
			totalTrackCount: work.totalTrackCount,
		};
		for (const song of work.songs) {
			const key = song.name ?? "不明";
			datum[key] = song.trackCount;
		}
		return datum;
	});

	return { data, keys, colors };
}

// Nivo用データ形式に変換（単純モード）
function transformSimpleDataForNivo(
	data: WorkStat[],
	sortOrder: SortOrder,
	orientation: ChartOrientation,
): { data: BarDatum[]; keys: string[] } {
	if (data.length === 0) {
		return { data: [], keys: [] };
	}

	// ソート
	// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
	// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
	let sorted: WorkStat[];
	if (orientation === "horizontal") {
		if (sortOrder === "id") {
			sorted = [...data].sort((a, b) => b.id.localeCompare(a.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...data].sort((a, b) => b.trackCount - a.trackCount);
		} else {
			sorted = [...data].sort((a, b) => a.trackCount - b.trackCount);
		}
	} else {
		// 縦グラフ: 通常の順序
		if (sortOrder === "id") {
			sorted = [...data].sort((a, b) => a.id.localeCompare(b.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...data].sort((a, b) => a.trackCount - b.trackCount);
		} else {
			sorted = [...data].sort((a, b) => b.trackCount - a.trackCount);
		}
	}

	const nivoData: BarDatum[] = sorted.map((w) => ({
		workId: w.id,
		workName: w.shortName ?? w.name ?? "不明",
		trackCount: w.trackCount,
	}));

	return { data: nivoData, keys: ["trackCount"] };
}

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

	// 初回読み込み用（フルスクリーンローディング）
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	// 追加データ取得中（チャート表示したまま）
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isStacked, setIsStacked] = useState(true);
	const [orientation, setOrientation] =
		useState<ChartOrientation>("horizontal");

	// 両モードのデータをキャッシュ（切替時に再取得しない）
	const [stackedData, setStackedData] = useState<StackedWorkStat[]>([]);
	const [stackedDataLoaded, setStackedDataLoaded] = useState(false);
	const [worksData, setWorksData] = useState<WorkStat[]>([]);
	const [worksDataLoaded, setWorksDataLoaded] = useState(false);

	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [selectedWorkName, setSelectedWorkName] = useState<string>("");
	const [songsData, setSongsData] = useState<
		Array<{ id: string; name: string | null; trackCount: number }>
	>([]);

	// 表示順: "count-desc" = トラック数順(降順), "count-asc" = トラック数順(昇順), "id" = ID順
	const [sortOrder, setSortOrder] = useState<SortOrder>("id");

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

	// 通信中フラグ（重複リクエスト防止用）
	const [isFetchingStacked, setIsFetchingStacked] = useState(false);
	const [isFetchingWorks, setIsFetchingWorks] = useState(false);
	const [isFetchingSongs, setIsFetchingSongs] = useState(false);

	// 積み上げデータを取得
	const fetchStackedData = useCallback(
		async (isInitial = false, force = false) => {
			if (isFetchingStacked) return;
			if (!force && stackedDataLoaded) return;

			setIsFetchingStacked(true);
			if (isInitial) {
				setIsInitialLoading(true);
			} else {
				setIsUpdating(true);
			}
			setError(null);
			try {
				let response: StackedWorkStatsResponse;
				switch (entityType) {
					case "circle":
						response = (await publicApi.circles.stats(
							entityId,
							undefined,
							true,
						)) as StackedWorkStatsResponse;
						break;
					case "artist":
						response = (await publicApi.artists.stats(
							entityId,
							undefined,
							true,
						)) as StackedWorkStatsResponse;
						break;
					case "event":
						response = (await publicApi.events.stats(
							entityId,
							undefined,
							true,
						)) as StackedWorkStatsResponse;
						break;
				}
				setStackedData(response.works);
				setStackedDataLoaded(true);
			} catch {
				setError("統計データの取得に失敗しました");
			} finally {
				setIsFetchingStacked(false);
				setIsInitialLoading(false);
				setIsUpdating(false);
			}
		},
		[entityType, entityId, isFetchingStacked, stackedDataLoaded],
	);

	// 単純データを取得
	const fetchWorksData = useCallback(async () => {
		if (isFetchingWorks || worksDataLoaded) return;

		setIsFetchingWorks(true);
		setIsUpdating(true);
		setError(null);
		try {
			let response: WorkStatsResponse;
			switch (entityType) {
				case "circle":
					response = (await publicApi.circles.stats(
						entityId,
						undefined,
						false,
					)) as WorkStatsResponse;
					break;
				case "artist":
					response = (await publicApi.artists.stats(
						entityId,
						undefined,
						false,
					)) as WorkStatsResponse;
					break;
				case "event":
					response = (await publicApi.events.stats(
						entityId,
						undefined,
						false,
					)) as WorkStatsResponse;
					break;
			}
			setWorksData(response.works);
			setWorksDataLoaded(true);
		} catch {
			setError("統計データの取得に失敗しました");
		} finally {
			setIsFetchingWorks(false);
			setIsUpdating(false);
		}
	}, [entityType, entityId, isFetchingWorks, worksDataLoaded]);

	// 原曲詳細を取得（ドリルダウン用）
	const fetchSongsData = useCallback(
		async (workId: string, workName: string) => {
			if (isFetchingSongs) return;

			setIsFetchingSongs(true);
			setIsUpdating(true);
			try {
				let response: SongStatsResponse;
				switch (entityType) {
					case "circle":
						response = (await publicApi.circles.stats(
							entityId,
							workId,
							false,
						)) as SongStatsResponse;
						break;
					case "artist":
						response = (await publicApi.artists.stats(
							entityId,
							workId,
							false,
						)) as SongStatsResponse;
						break;
					case "event":
						response = (await publicApi.events.stats(
							entityId,
							workId,
							false,
						)) as SongStatsResponse;
						break;
				}
				setSongsData(response.songs);
				setSelectedWorkId(workId);
				setSelectedWorkName(workName);
			} catch {
				setError("原曲データの取得に失敗しました");
			} finally {
				setIsFetchingSongs(false);
				setIsUpdating(false);
			}
		},
		[entityType, entityId, isFetchingSongs],
	);

	// エンティティ変更時にデータをリセット
	// biome-ignore lint/correctness/useExhaustiveDependencies: entityId変更時にステートリセットが必要
	useEffect(() => {
		setStackedData([]);
		setStackedDataLoaded(false);
		setWorksData([]);
		setWorksDataLoaded(false);
		setSongsData([]);
		setSelectedWorkId(null);
		setSelectedWorkName("");
		setIsStacked(true);
		setIsInitialLoading(true);
	}, [entityId]);

	// 初回読み込み
	useEffect(() => {
		if (isStacked && !stackedDataLoaded) {
			fetchStackedData(true);
		} else if (!isStacked && !worksDataLoaded) {
			fetchWorksData();
		}
	}, [
		isStacked,
		stackedDataLoaded,
		worksDataLoaded,
		fetchStackedData,
		fetchWorksData,
	]);

	// モバイルになったら単純モードのデータを読み込む
	useEffect(() => {
		if (isMobile && !worksDataLoaded) {
			fetchWorksData();
		}
	}, [isMobile, worksDataLoaded, fetchWorksData]);

	// モード切替
	const handleModeToggle = useCallback(() => {
		setSelectedWorkId(null);
		setSongsData([]);
		setIsStacked((prev) => {
			const nextIsStacked = !prev;
			if (nextIsStacked && !stackedDataLoaded) {
				fetchStackedData();
			} else if (!nextIsStacked && !worksDataLoaded) {
				fetchWorksData();
			}
			return nextIsStacked;
		});
	}, [stackedDataLoaded, worksDataLoaded, fetchStackedData, fetchWorksData]);

	// ドリルダウン戻る
	const handleBack = useCallback(() => {
		setSelectedWorkId(null);
		setSongsData([]);
	}, []);

	// バークリックハンドラ
	const handleBarClick = useCallback(
		(bar: BarDatum) => {
			const workId = bar.workId as string;
			const workName = bar.workName as string;
			if (workId) {
				fetchSongsData(workId, workName);
			}
		},
		[fetchSongsData],
	);

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

	// チャートデータ計算
	const chartData = useMemo(() => {
		// ドリルダウン表示中
		if (selectedWorkId && songsData.length > 0) {
			// ソート
			// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
			// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
			let sorted: typeof songsData;
			if (effectiveOrientation === "horizontal") {
				if (sortOrder === "id") {
					sorted = [...songsData].sort((a, b) => b.id.localeCompare(a.id));
				} else if (sortOrder === "count-asc") {
					sorted = [...songsData].sort((a, b) => b.trackCount - a.trackCount);
				} else {
					sorted = [...songsData].sort((a, b) => a.trackCount - b.trackCount);
				}
			} else {
				// 縦グラフ: 通常の順序
				if (sortOrder === "id") {
					sorted = [...songsData].sort((a, b) => a.id.localeCompare(b.id));
				} else if (sortOrder === "count-asc") {
					sorted = [...songsData].sort((a, b) => a.trackCount - b.trackCount);
				} else {
					sorted = [...songsData].sort((a, b) => b.trackCount - a.trackCount);
				}
			}
			return {
				data: sorted.map((s) => ({
					songId: s.id,
					songName: s.name ?? "不明",
					trackCount: s.trackCount,
				})),
				keys: ["trackCount"],
				indexBy: "songName",
				colors: ["#3b82f6"],
				isStacked: false,
			};
		}

		// 積み上げモード
		if (effectiveIsStacked && stackedData.length > 0) {
			const { data, keys, colors } = transformStackedDataForNivo(
				stackedData,
				sortOrder,
				effectiveOrientation,
			);
			return {
				data,
				keys,
				indexBy: "workName",
				colors: (bar: { id: string | number }) =>
					colors[String(bar.id)] || "#3b82f6",
				isStacked: true,
			};
		}

		// 単純モード
		if (!effectiveIsStacked && worksData.length > 0) {
			const { data, keys } = transformSimpleDataForNivo(
				worksData,
				sortOrder,
				effectiveOrientation,
			);
			return {
				data,
				keys,
				indexBy: "workName",
				colors: ["#3b82f6"],
				isStacked: false,
			};
		}

		return null;
	}, [
		effectiveIsStacked,
		stackedData,
		worksData,
		songsData,
		selectedWorkId,
		sortOrder,
		effectiveOrientation,
	]);

	// 初回ローディング
	if (isInitialLoading) {
		return <WorkStatsSkeleton />;
	}

	// エラー表示
	if (error) {
		return (
			<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-error/10">
					<BarChart3 className="size-8 text-error" />
				</div>
				<p className="text-error">{error}</p>
			</div>
		);
	}

	// データなし
	if (!chartData || chartData.data.length === 0) {
		return (
			<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-base-200">
					<BarChart3 className="size-8 text-base-content/50" />
				</div>
				<p className="text-base-content/70">統計データがありません</p>
			</div>
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
			<div className="space-y-6 rounded-lg border-2 border-base-content/20 bg-base-100 p-6 shadow-sm">
				{/* タイトル行 */}
				{selectedWorkId ? (
					<div className="flex items-center gap-3">
						<button
							type="button"
							className="btn btn-ghost btn-sm gap-1"
							onClick={handleBack}
						>
							<ArrowLeft className="size-4" />
							戻る
						</button>
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
						<button
							type="button"
							className={`btn btn-sm gap-1 md:hidden ${sortOrder === "id" ? "btn-outline" : "btn-secondary"}`}
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
						</button>
					</div>
				)}

				{/* コントロール行: 左=並び替え、中央=表示モード、右=向き - デスクトップのみ */}
				<div className="hidden items-center justify-between md:flex">
					{/* 左: 並び替えボタン */}
					<button
						type="button"
						className={`btn btn-sm gap-1 ${sortOrder === "id" ? "btn-outline" : "btn-secondary"}`}
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
					</button>

					{/* 中央: 表示モード切替 - デスクトップのみ、ドリルダウン時は非表示 */}
					{!selectedWorkId ? (
						<div className="hidden items-center gap-2 md:flex">
							<div className="join">
								<button
									type="button"
									className={`btn join-item btn-sm gap-1 ${isStacked ? "btn-primary" : "btn-ghost"}`}
									onClick={() => !isStacked && handleModeToggle()}
									disabled={isUpdating}
								>
									<Layers className="size-4" />
									積み上げ
								</button>
								<button
									type="button"
									className={`btn join-item btn-sm gap-1 ${!isStacked ? "btn-primary" : "btn-ghost"}`}
									onClick={() => isStacked && handleModeToggle()}
									disabled={isUpdating}
								>
									{effectiveOrientation === "horizontal" ? (
										<BarChartHorizontal className="size-4" />
									) : (
										<BarChart3 className="size-4" />
									)}
									単純
								</button>
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
						<button
							type="button"
							className={`btn btn-sm btn-square join-item ${
								effectiveOrientation === "vertical"
									? "btn-primary"
									: "btn-ghost"
							}`}
							onClick={() => handleOrientationChange("vertical")}
							title="縦グラフ"
						>
							<BarChart3 className="size-4" />
						</button>
						<button
							type="button"
							className={`btn btn-sm btn-square join-item ${
								effectiveOrientation === "horizontal"
									? "btn-primary"
									: "btn-ghost"
							}`}
							onClick={() => handleOrientationChange("horizontal")}
							title="横グラフ"
						>
							<BarChartHorizontal className="size-4" />
						</button>
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
			</div>
		</div>
	);
}
