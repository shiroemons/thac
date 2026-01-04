import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Loader2, Music } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicBreadcrumb } from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import {
	type PublicCategory,
	type PublicSongItem,
	type PublicWorkItem,
	publicApi,
} from "@/lib/public-api";

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

interface OriginalSongsSearchParams {
	type?: string;
	open?: string; // カンマ区切りの作品ID（例: "0201,0202"）
}

function parseTypeParam(value: unknown): string {
	if (typeof value === "string" && value !== "") return value;
	return "all";
}

function parseOpenParam(value: unknown): string | undefined {
	if (typeof value !== "string" || value === "") return undefined;
	return value;
}

export const Route = createFileRoute("/_public/original-songs")({
	head: () => createPageHead("原曲"),
	loaderDeps: ({ search }) => ({
		type: parseTypeParam(search.type),
	}),
	loader: async ({ deps }) => {
		const [categoriesRes, worksRes] = await Promise.all([
			publicApi.categories(),
			publicApi.works.list({
				category: deps.type !== "all" ? deps.type : undefined,
				limit: 100,
			}),
		]);
		// totalSongCountはworksから集計
		const totalSongCount = worksRes.data.reduce(
			(sum, w) => sum + (w.songCount ?? 0),
			0,
		);
		return {
			categories: categoriesRes.data,
			works: worksRes.data,
			totalSongCount,
		};
	},
	component: OriginalSongsPage,
	validateSearch: (
		search: Record<string, unknown>,
	): OriginalSongsSearchParams => {
		return {
			type: parseTypeParam(search.type),
			open: parseOpenParam(search.open),
		};
	},
});

// =============================================================================
// localStorage キー
// =============================================================================
const STORAGE_KEY = "original-songs-expanded-works";

// =============================================================================
// メインコンポーネント
// =============================================================================

function OriginalSongsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { type = "all", open } = Route.useSearch();
	const { categories, works, totalSongCount } = Route.useLoaderData();

	// 遅延読み込み用の状態管理
	const [songCache, setSongCache] = useState<Map<string, PublicSongItem[]>>(
		new Map(),
	);
	const [loadingWorks, setLoadingWorks] = useState<Set<string>>(new Set());
	const [errorWorks, setErrorWorks] = useState<Map<string, string>>(new Map());

	// 展開中の作品ID一覧（URLパラメータから取得）
	const expandedWorkIdsFromUrl = useMemo(() => {
		if (open) {
			const ids = open.split(",").filter((id) => id.trim() !== "");
			const validIds = ids.filter((id) => works.some((w) => w.id === id));
			return new Set(validIds);
		}
		return new Set<string>();
	}, [open, works]);

	const expandedWorkIds = expandedWorkIdsFromUrl;

	// 楽曲を遅延取得する関数
	const fetchSongsForWork = useCallback(
		async (workId: string) => {
			// キャッシュ済みならスキップ
			if (songCache.has(workId)) return;

			// ローディング状態を設定
			setLoadingWorks((prev) => new Set(prev).add(workId));
			setErrorWorks((prev) => {
				const next = new Map(prev);
				next.delete(workId);
				return next;
			});

			try {
				const response = await publicApi.songs.list({ workId, limit: 100 });
				setSongCache((prev) => new Map(prev).set(workId, response.data));
			} catch (_error) {
				setErrorWorks((prev) =>
					new Map(prev).set(workId, "楽曲の読み込みに失敗しました"),
				);
			} finally {
				setLoadingWorks((prev) => {
					const next = new Set(prev);
					next.delete(workId);
					return next;
				});
			}
		},
		[songCache],
	);

	// 初回マウント時に localStorage から復元（URL パラメータがない場合のみ）
	// biome-ignore lint/correctness/useExhaustiveDependencies: 意図的に初回マウント時のみ実行
	useEffect(() => {
		if (!open) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved) as string[];
					const validIds = parsed.filter((id) =>
						works.some((w) => w.id === id),
					);
					if (validIds.length > 0) {
						navigate({
							search: { type, open: validIds.join(",") },
							replace: true,
						});
					}
				} catch {
					// ignore
				}
			}
		}
	}, []);

	// 展開中の作品の楽曲を取得
	// biome-ignore lint/correctness/useExhaustiveDependencies: expandedWorkIdsの変更時のみ実行
	useEffect(() => {
		for (const workId of expandedWorkIds) {
			fetchSongsForWork(workId);
		}
	}, [expandedWorkIds]);

	// 作品アコーディオンの展開/折りたたみ
	const handleToggle = (workId: string) => {
		const next = new Set(expandedWorkIds);
		if (next.has(workId)) {
			next.delete(workId);
		} else {
			next.add(workId);
			// 展開時に楽曲を取得
			fetchSongsForWork(workId);
		}

		// URLとlocalStorageを更新
		const openParam = next.size > 0 ? [...next].join(",") : undefined;
		if (next.size > 0) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}

		navigate({
			search: { type, open: openParam },
		});
	};

	// カテゴリ変更
	const handleTypeChange = (newType: string) => {
		// キャッシュをクリア
		setSongCache(new Map());
		setLoadingWorks(new Set());
		setErrorWorks(new Map());

		navigate({
			search: { type: newType, open: undefined },
		});
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "原曲" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">原曲一覧</h1>
					<p className="mt-1 text-base-content/70">
						東方Project公式楽曲 · {works.length}作品 · {totalSongCount}曲
					</p>
				</div>
				<Link to="/official-works" className="btn btn-outline btn-sm gap-1">
					<Music className="size-4" />
					公式作品一覧
					<ChevronRight className="size-4" />
				</Link>
			</div>

			{/* Step 1: カテゴリフィルター */}
			<div className="space-y-2">
				<h2 className="font-medium text-base-content/70 text-sm">
					カテゴリを選択
				</h2>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className={`btn btn-sm ${type === "all" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => handleTypeChange("all")}
						aria-pressed={type === "all"}
					>
						すべて
					</button>
					{categories.map((cat: PublicCategory) => (
						<button
							key={cat.code}
							type="button"
							className={`btn btn-sm ${type === cat.code ? "btn-primary" : "btn-ghost"}`}
							onClick={() => handleTypeChange(cat.code)}
							aria-pressed={type === cat.code}
						>
							{cat.name}
						</button>
					))}
				</div>
			</div>

			{/* Step 2: 作品アコーディオン */}
			<div className="space-y-2">
				<h2 className="font-medium text-base-content/70 text-sm">
					作品を選択して楽曲を表示
				</h2>
				{works.length === 0 ? (
					<p className="text-base-content/50">
						選択したカテゴリに作品がありません
					</p>
				) : (
					<div className="join join-vertical w-full">
						{works.map((work: PublicWorkItem) => (
							<WorkAccordion
								key={work.id}
								work={work}
								songs={songCache.get(work.id)}
								isExpanded={expandedWorkIds.has(work.id)}
								isLoading={loadingWorks.has(work.id)}
								error={errorWorks.get(work.id) ?? null}
								onToggle={() => handleToggle(work.id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// =============================================================================
// 作品アコーディオン
// =============================================================================

interface WorkAccordionProps {
	work: PublicWorkItem;
	songs: PublicSongItem[] | undefined;
	isExpanded: boolean;
	isLoading: boolean;
	error: string | null;
	onToggle: () => void;
}

function WorkAccordion({
	work,
	songs,
	isExpanded,
	isLoading,
	error,
	onToggle,
}: WorkAccordionProps) {
	const displayName = work.nameJa;

	// トラック番号でソート
	const sortedSongs = useMemo(() => {
		if (!songs) return [];
		return [...songs].sort(
			(a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
		);
	}, [songs]);

	// コンテンツの描画
	const renderContent = () => {
		// ローディング中
		if (isLoading) {
			return (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="size-5 animate-spin text-primary" />
					<span className="ml-2 text-base-content/70">楽曲を読み込み中...</span>
				</div>
			);
		}

		// エラー発生時
		if (error) {
			return (
				<div className="py-4 text-center text-error">
					<p>{error}</p>
				</div>
			);
		}

		// データなし、または未取得
		if (!songs || songs.length === 0) {
			return (
				<p className="pt-2 text-base-content/50">楽曲データがありません</p>
			);
		}

		// データ表示
		return (
			<div className="overflow-x-auto pt-2">
				<table className="table-sm table">
					<thead>
						<tr>
							<th className="w-16">Track</th>
							<th>曲名</th>
							<th className="hidden sm:table-cell">作曲者</th>
							<th className="w-24 text-right">アレンジ数</th>
						</tr>
					</thead>
					<tbody>
						{sortedSongs.map((song) => (
							<tr key={song.id} className="hover:bg-base-200/50">
								<td className="text-base-content/70">
									{song.trackNumber != null
										? song.trackNumber.toString().padStart(2, "0")
										: "-"}
								</td>
								<td>
									<Link
										to="/original-songs/$id"
										params={{ id: song.id }}
										className="hover:text-primary"
									>
										<div className="font-medium">{song.nameJa}</div>
									</Link>
								</td>
								<td className="hidden text-base-content/70 sm:table-cell">
									{song.composerName || "-"}
								</td>
								<td className="text-right text-primary">
									{formatNumber(song.arrangeCount)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<div className="collapse-arrow join-item collapse border border-base-300 bg-base-100">
			<input
				type="checkbox"
				checked={isExpanded}
				onChange={onToggle}
				aria-label={`${displayName}の楽曲一覧を${isExpanded ? "閉じる" : "開く"}`}
			/>
			<div className="collapse-title font-medium">
				<span>{displayName}</span>
				<span className="badge badge-ghost badge-sm ml-2">
					{work.songCount ?? 0}曲
				</span>
			</div>
			<div className="collapse-content">{renderContent()}</div>
		</div>
	);
}
