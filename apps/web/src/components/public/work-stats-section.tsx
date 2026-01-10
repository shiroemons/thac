"use client";

import type { BarCustomLayerProps, BarDatum } from "@nivo/bar";
import {
	ArrowLeft,
	BarChart3,
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
	innerWidth,
	labelTextColor,
}: BarCustomLayerProps<BarDatum> & { labelTextColor?: string }) {
	// indexValue（workName）ごとにバーをグループ化
	const barsByIndex = new Map<
		string | number,
		{ maxX: number; y: number; height: number; total: number }
	>();

	for (const bar of bars) {
		const indexValue = bar.data.indexValue;
		const rightEdge = bar.x + bar.width;
		const total = (bar.data.data.totalTrackCount as number) || 0;

		const existing = barsByIndex.get(indexValue);
		if (!existing || rightEdge > existing.maxX) {
			barsByIndex.set(indexValue, {
				maxX: rightEdge,
				y: bar.y,
				height: bar.height,
				total,
			});
		}
	}

	return (
		<g>
			{Array.from(barsByIndex.entries()).map(
				([indexValue, { maxX, y, height, total }]) => {
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

type SortOrder = "count-desc" | "count-asc" | "id";

// Nivo用データ形式に変換（積み上げモード）
function transformStackedDataForNivo(
	stackedData: StackedWorkStat[],
	sortOrder: SortOrder,
): { data: BarDatum[]; keys: string[]; colors: Record<string, string> } {
	if (stackedData.length === 0) {
		return { data: [], keys: [], colors: {} };
	}

	// ソート（横棒グラフは配列の最初が下に表示されるため、視覚的な順序を逆にする）
	let sorted: StackedWorkStat[];
	if (sortOrder === "id") {
		sorted = [...stackedData].sort((a, b) => b.id.localeCompare(a.id));
	} else if (sortOrder === "count-asc") {
		// 視覚的な昇順（小さい値が上）→ 配列は降順
		sorted = [...stackedData].sort(
			(a, b) => b.totalTrackCount - a.totalTrackCount,
		);
	} else {
		// count-desc（デフォルト）視覚的な降順（大きい値が上）→ 配列は昇順
		sorted = [...stackedData].sort(
			(a, b) => a.totalTrackCount - b.totalTrackCount,
		);
	}

	// 全曲のユニークキーを収集
	const songKeysSet = new Set<string>();
	const colors: Record<string, string> = {};
	for (const work of sorted) {
		for (const song of work.songs) {
			const key = song.name ?? "不明";
			songKeysSet.add(key);
			if (!colors[key]) {
				colors[key] = getColorForItem(song.id);
			}
		}
	}
	const keys = Array.from(songKeysSet);

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
): { data: BarDatum[]; keys: string[] } {
	if (data.length === 0) {
		return { data: [], keys: [] };
	}

	// 横棒グラフは配列の最初が下に表示されるため、視覚的な順序を逆にする
	let sorted: WorkStat[];
	if (sortOrder === "id") {
		sorted = [...data].sort((a, b) => b.id.localeCompare(a.id));
	} else if (sortOrder === "count-asc") {
		// 視覚的な昇順（小さい値が上）→ 配列は降順
		sorted = [...data].sort((a, b) => b.trackCount - a.trackCount);
	} else {
		// count-desc（デフォルト）視覚的な降順（大きい値が上）→ 配列は昇順
		sorted = [...data].sort((a, b) => a.trackCount - b.trackCount);
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

	// 初回読み込み用（フルスクリーンローディング）
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	// 追加データ取得中（チャート表示したまま）
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isStacked, setIsStacked] = useState(true);

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
			// 横棒グラフは配列の最初が下に表示されるため、視覚的な順序を逆にする
			let sorted: typeof songsData;
			if (sortOrder === "id") {
				sorted = [...songsData].sort((a, b) => b.id.localeCompare(a.id));
			} else if (sortOrder === "count-asc") {
				// 視覚的な昇順（小さい値が上）→ 配列は降順
				sorted = [...songsData].sort((a, b) => b.trackCount - a.trackCount);
			} else {
				// count-desc（デフォルト）視覚的な降順（大きい値が上）→ 配列は昇順
				sorted = [...songsData].sort((a, b) => a.trackCount - b.trackCount);
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
		if (isStacked && stackedData.length > 0) {
			const { data, keys, colors } = transformStackedDataForNivo(
				stackedData,
				sortOrder,
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
		if (!isStacked && worksData.length > 0) {
			const { data, keys } = transformSimpleDataForNivo(worksData, sortOrder);
			return {
				data,
				keys,
				indexBy: "workName",
				colors: ["#3b82f6"],
				isStacked: false,
			};
		}

		return null;
	}, [isStacked, stackedData, worksData, songsData, selectedWorkId, sortOrder]);

	// 初回ローディング
	if (isInitialLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center rounded-lg bg-base-100 shadow-sm">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
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

	const chartHeight = Math.max(300, chartData.data.length * 40);

	return (
		<div className="space-y-4">
			{/* モード切替 or ドリルダウンタイトル */}
			{selectedWorkId ? (
				<div className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-2">
					<button
						type="button"
						className="btn btn-ghost btn-sm gap-1"
						onClick={handleBack}
					>
						<ArrowLeft className="size-4" />
						戻る
					</button>
					<div>
						<span className="font-medium text-primary">{selectedWorkName}</span>
						<span className="text-base-content/70">の原曲別トラック数</span>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<span className="text-base-content/60 text-sm">表示モード:</span>
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
							<BarChart3 className="size-4" />
							単純
						</button>
					</div>
					{isUpdating && (
						<Loader2 className="size-4 animate-spin text-primary" />
					)}
				</div>
			)}

			{/* ソート切替 */}
			<div className="flex items-center gap-2">
				<span className="text-base-content/60 text-sm">並び替え:</span>
				<div className="join">
					<button
						type="button"
						className={`btn join-item btn-sm gap-1 ${sortOrder === "id" ? "btn-secondary" : "btn-ghost"}`}
						onClick={() => setSortOrder("id")}
					>
						<SortAsc className="size-4" />
						ID順
					</button>
					<button
						type="button"
						className={`btn join-item btn-sm gap-1 ${sortOrder.startsWith("count") ? "btn-secondary" : "btn-ghost"}`}
						onClick={() =>
							setSortOrder(
								sortOrder === "count-desc" ? "count-asc" : "count-desc",
							)
						}
					>
						{sortOrder === "count-desc" ? (
							<SortDesc className="size-4" />
						) : (
							<SortAsc className="size-4" />
						)}
						トラック数順
						{sortOrder.startsWith("count") && (
							<span className="text-xs opacity-70">
								({sortOrder === "count-desc" ? "降順" : "昇順"})
							</span>
						)}
					</button>
				</div>
			</div>

			{/* チャート */}
			<div
				className="rounded-lg bg-base-100 p-4 shadow-sm"
				style={{ height: chartHeight }}
			>
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
						layout="horizontal"
						groupMode={chartData.isStacked ? "stacked" : "grouped"}
						colors={chartData.colors}
						margin={{ top: 10, right: 80, bottom: 30, left: 150 }}
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
											/>
										),
									]
								: ["grid", "axes", "bars", "markers", "legends"]
						}
						enableLabel
						label={(d) => (d.value && d.value > 0 ? `${d.value}` : "")}
						labelSkipWidth={20}
						labelTextColor="#ffffff"
						axisTop={null}
						axisRight={null}
						axisBottom={{
							tickSize: 5,
							tickPadding: 5,
							tickRotation: 0,
						}}
						axisLeft={{
							tickSize: 5,
							tickPadding: 5,
							tickRotation: 0,
							truncateTickAt: 12,
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
	);
}
