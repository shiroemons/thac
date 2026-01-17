import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Disc3, Loader2, Music, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	DetailTabs,
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	TabIcons,
	WorkStatsSection,
	WorkStatsSkeleton,
} from "@/components/public";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import {
	type ArtistDetailTab,
	parseArtistDetailTab,
	TAB_LABELS,
} from "@/lib/detail-tab-utils";
import { formatNumber } from "@/lib/format";
import { createPublicArtistHead } from "@/lib/head";
import { type PublicArtistTrack, publicApi } from "@/lib/public-api";
import {
	publicWorkStatsSimpleQueryOptions,
	publicWorkStatsStackedQueryOptions,
} from "@/lib/public-query-options";

interface ArtistDetailSearchParams {
	tab?: ArtistDetailTab;
}

export const Route = createFileRoute("/_public/artists_/$id")({
	validateSearch: (
		search: Record<string, unknown>,
	): ArtistDetailSearchParams => ({
		tab: parseArtistDetailTab(search.tab),
	}),
	loader: async ({ params, context }) => {
		try {
			const artist = await publicApi.artists.get(params.id);

			// バックグラウンドで統計データをプリフェッチ（非ブロッキング）
			context.queryClient.prefetchQuery(
				publicWorkStatsStackedQueryOptions("artist", params.id),
			);
			context.queryClient.prefetchQuery(
				publicWorkStatsSimpleQueryOptions("artist", params.id),
			);

			return { artist };
		} catch {
			return { artist: null };
		}
	},
	head: ({ loaderData }) => createPublicArtistHead(loaderData?.artist),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: ArtistDetailPage,
});

const PAGE_SIZE = 20;

// 名義タイプ名
const aliasTypeNames: Record<string, string> = {
	alternate: "別名義",
	unit: "ユニット",
	nickname: "愛称",
};

// タブ設定
const ARTIST_TAB_CONFIGS: {
	key: ArtistDetailTab;
	label: string;
	icon: React.ReactNode;
}[] = [
	{ key: "tracks", label: TAB_LABELS.tracks, icon: TabIcons.tracks },
	{ key: "stats", label: TAB_LABELS.stats, icon: TabIcons.stats },
];

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const { artist } = Route.useLoaderData();
	const { tab: activeTab = "tracks" } = Route.useSearch();
	const navigate = useNavigate();

	// コンテンツ表示用のタブ状態（アニメーション完了後に更新）
	const [contentTab, setContentTab] = useState(activeTab);
	const isTabTransitioning = activeTab !== contentTab;

	// タブ変更時、1フレーム遅延してコンテンツを更新
	useEffect(() => {
		if (activeTab !== contentTab) {
			const id = requestAnimationFrame(() => {
				setContentTab(activeTab);
			});
			return () => cancelAnimationFrame(id);
		}
	}, [activeTab, contentTab]);

	// トラック一覧の状態
	const [tracks, setTracks] = useState<PublicArtistTrack[]>([]);
	const [tracksTotal, setTracksTotal] = useState(0);
	const [tracksPage, setTracksPage] = useState(1);
	const [tracksLoading, setTracksLoading] = useState(false);
	const [tracksLoaded, setTracksLoaded] = useState(false);

	// フィルター（名義単位なので役割フィルターのみ）
	const [roleFilter, setRoleFilter] = useState<string>("all");

	// タブ切り替え
	const handleTabChange = (tab: ArtistDetailTab) => {
		navigate({
			to: "/artists/$id",
			params: { id },
			search: { tab },
		});
	};

	// トラック一覧を取得
	const fetchTracks = useCallback(
		async (page: number, role?: string) => {
			if (!artist) return;
			setTracksLoading(true);
			try {
				const res = await publicApi.artists.tracks(id, {
					page,
					limit: PAGE_SIZE,
					role: role === "all" ? undefined : role,
				});
				setTracks(res.data);
				setTracksTotal(res.total);
				setTracksPage(page);
				setTracksLoaded(true);
			} catch {
				setTracks([]);
				setTracksTotal(0);
			} finally {
				setTracksLoading(false);
			}
		},
		[artist, id],
	);

	// タブ切替時に遅延読み込み
	useEffect(() => {
		if (activeTab === "tracks" && !tracksLoaded && artist) {
			fetchTracks(1, roleFilter);
		}
	}, [activeTab, tracksLoaded, artist, fetchTracks, roleFilter]);

	// フィルター変更時
	const handleRoleFilterChange = (value: string) => {
		setRoleFilter(value);
		fetchTracks(1, value);
	};

	// ページ変更時
	const handlePageChange = (page: number) => {
		fetchTracks(page, roleFilter);
	};

	// メタ情報の折りたたみ状態
	const [isMetaExpanded, setIsMetaExpanded] = useState(false);

	// 名義が見つからない場合
	if (!artist) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "アーティスト", href: "/artists" }, { label: id }]}
				/>
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">アーティストが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのアーティストは存在しません
					</p>
					<Link to="/artists" preload="intent" className="btn btn-primary mt-4">
						アーティスト一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const tracksTotalPages = Math.ceil(tracksTotal / PAGE_SIZE);
	const hasOtherAliases = artist.otherAliases.length > 0;

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "アーティスト", href: "/artists" },
					{ label: artist.name },
				]}
			/>

			{/* プロフィールカード */}
			<div className="overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-lg">
				{/* グラデーションヘッダー */}
				<div className="gradient-artist px-6 py-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
						{/* アバター */}
						<div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-base-100/80 shadow-lg transition-transform duration-300 hover:scale-105 sm:size-24">
							<User className="size-10 text-primary sm:size-12" />
						</div>

						<div className="min-w-0 flex-1 space-y-3">
							{/* 名前 */}
							<div>
								<h1 className="font-bold text-2xl sm:text-3xl">
									{artist.name}
								</h1>
								{!artist.isMainName && (
									<p className="mt-1 text-base-content/70">
										{artist.artistName}
										{artist.aliasTypeCode && (
											<span className="badge badge-ghost badge-sm ml-2">
												{aliasTypeNames[artist.aliasTypeCode] ||
													artist.aliasTypeCode}
											</span>
										)}
									</p>
								)}
							</div>

							{/* 役割バッジ */}
							<div className="flex flex-wrap gap-2">
								{artist.roles.map((role) => (
									<span
										key={role.roleCode}
										className="badge badge-primary badge-outline hover:badge-primary transition-all duration-300 hover:scale-105"
									>
										{role.label}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* 統計カード */}
				<div className="bg-base-100 p-6">
					<div className="grid grid-cols-2 gap-4">
						<div className="rounded-2xl bg-base-200/50 p-4 text-center transition-all duration-300 hover:bg-base-200/70 hover:ring-2 hover:ring-primary/10">
							<div className="flex items-center justify-center gap-2 text-primary">
								<Music className="size-5" />
								<span className="font-bold text-2xl">
									{formatNumber(artist.stats.trackCount)}
								</span>
							</div>
							<p className="mt-1 text-base-content/70 text-sm">トラック</p>
						</div>
						<div className="rounded-2xl bg-base-200/50 p-4 text-center transition-all duration-300 hover:bg-base-200/70 hover:ring-2 hover:ring-secondary/10">
							<div className="flex items-center justify-center gap-2 text-secondary">
								<Disc3 className="size-5" />
								<span className="font-bold text-2xl">
									{formatNumber(artist.stats.releaseCount)}
								</span>
							</div>
							<p className="mt-1 text-base-content/70 text-sm">リリース</p>
						</div>
					</div>

					{/* 他名義セクション - モバイルで折りたたみ */}
					{hasOtherAliases && (
						<div className="mt-4 border-base-200 border-t pt-4">
							{/* モバイル: 折りたたみ */}
							<div className="sm:hidden">
								<button
									type="button"
									onClick={() => setIsMetaExpanded(!isMetaExpanded)}
									className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-2 py-2 text-base-content/60 text-sm transition-colors duration-300 hover:bg-base-200/50"
								>
									<span>他の名義 ({artist.otherAliases.length}件)</span>
									<ChevronDown
										className={`size-5 transition-transform duration-300 ${isMetaExpanded ? "rotate-180" : ""}`}
									/>
								</button>
								{isMetaExpanded && (
									<div className="mt-2 flex flex-wrap gap-2">
										{artist.otherAliases.map((alias) => (
											<Link
												key={alias.id}
												to="/artists/$id"
												params={{ id: alias.id }}
												preload="intent"
												className="badge badge-ghost hover:badge-primary min-h-[44px] px-3 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
											>
												{alias.name}
												{alias.aliasTypeCode && (
													<span className="ml-1 text-xs opacity-70">
														(
														{aliasTypeNames[alias.aliasTypeCode] ||
															alias.aliasTypeCode}
														)
													</span>
												)}
												<span className="ml-1 text-xs opacity-70">
													{alias.trackCount}曲
												</span>
											</Link>
										))}
									</div>
								)}
							</div>
							{/* デスクトップ: 常に表示 */}
							<div className="hidden sm:block">
								<p className="mb-2 text-base-content/60 text-sm">他の名義:</p>
								<div className="flex flex-wrap gap-2">
									{artist.otherAliases.map((alias) => (
										<Link
											key={alias.id}
											to="/artists/$id"
											params={{ id: alias.id }}
											preload="intent"
											className="badge badge-ghost hover:badge-primary transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
										>
											{alias.name}
											{alias.aliasTypeCode && (
												<span className="ml-1 text-xs opacity-70">
													(
													{aliasTypeNames[alias.aliasTypeCode] ||
														alias.aliasTypeCode}
													)
												</span>
											)}
											<span className="ml-1 text-xs opacity-70">
												{alias.trackCount}曲
											</span>
										</Link>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* タブ */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<DetailTabs
					tabs={ARTIST_TAB_CONFIGS}
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/>
				{contentTab === "tracks" && (
					<div className="flex flex-wrap gap-2">
						{/* 役割フィルター */}
						<select
							className="select select-bordered sm:select-sm min-h-[44px] sm:min-h-0"
							value={roleFilter}
							onChange={(e) => handleRoleFilterChange(e.target.value)}
						>
							<option value="all">すべての役割</option>
							{artist.roles.map((role) => (
								<option key={role.roleCode} value={role.roleCode}>
									{role.label}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* 参加トラック */}
			{contentTab === "tracks" && (
				<div className="space-y-4">
					{/* トラック一覧 */}
					{tracksLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : tracks.length === 0 ? (
						<EmptyState
							type="filter"
							title="該当するトラックがありません"
							description="フィルター条件を変更してお試しください"
						/>
					) : (
						<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm transition-shadow duration-300 hover:shadow-lg">
							<table className="table">
								<thead>
									<tr>
										<th>曲名</th>
										<th className="hidden md:table-cell">役割</th>
										<th className="hidden sm:table-cell">リリース</th>
										<th className="hidden lg:table-cell">原曲</th>
									</tr>
								</thead>
								<tbody>
									{tracks.map((credit) => (
										<tr
											key={credit.id}
											className="transition-colors duration-300 hover:bg-base-200/50"
										>
											<td className="py-3">
												<Link
													to="/tracks/$id"
													params={{ id: credit.track.id }}
													preload="intent"
													className="inline-block min-h-[44px] font-medium leading-[44px] transition-colors duration-300 hover:text-primary"
												>
													{credit.track.name}
												</Link>
											</td>
											<td className="hidden py-3 md:table-cell">
												<div className="flex flex-wrap gap-1">
													{credit.roles.map((role) => (
														<span
															key={role.roleCode}
															className="badge badge-outline badge-xs"
														>
															{role.label}
														</span>
													))}
												</div>
											</td>
											<td className="hidden py-3 sm:table-cell">
												<Link
													to="/releases/$id"
													params={{ id: credit.release.id }}
													preload="intent"
													className="text-base-content/70 text-sm transition-colors duration-300 hover:text-primary"
												>
													{credit.release.name}
												</Link>
												<div className="mt-1 flex flex-wrap gap-1">
													{credit.circles.map((circle) => (
														<Link
															key={circle.id}
															to="/circles/$id"
															params={{ id: circle.id }}
															preload="intent"
															className="text-base-content/60 text-xs transition-colors duration-300 hover:text-primary"
														>
															{circle.name}
														</Link>
													))}
												</div>
											</td>
											<td className="hidden py-3 lg:table-cell">
												{credit.originalSong ? (
													<Link
														to="/original-songs/$id"
														params={{ id: credit.originalSong.id }}
														preload="intent"
														className="text-base-content/70 text-sm transition-colors duration-300 hover:text-primary"
													>
														{credit.originalSong.name}
													</Link>
												) : (
													<span className="text-base-content/40">-</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* ページネーション */}
					{tracksTotalPages > 1 && (
						<Pagination
							currentPage={tracksPage}
							totalPages={tracksTotalPages}
							onPageChange={handlePageChange}
						/>
					)}
				</div>
			)}

			{/* 統計 */}
			{contentTab === "stats" &&
				(isTabTransitioning ? (
					<WorkStatsSkeleton />
				) : (
					<WorkStatsSection entityType="artist" entityId={id} />
				))}
		</div>
	);
}
