import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	Disc3,
	Loader2,
	Music,
	UserRound,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	DetailTabs,
	EmptyState,
	EntityDetailHeader,
	ExternalLink,
	GenreBadge,
	Pagination,
	PublicBreadcrumb,
	type StatItem,
	StatsCardGrid,
	TabIcons,
	type ViewMode,
	ViewToggle,
	WorkStatsSection,
	WorkStatsSkeleton,
} from "@/components/public";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import {
	type CircleDetailTab,
	parseCircleDetailTab,
	TAB_LABELS,
} from "@/lib/detail-tab-utils";
import { createPublicCircleHead } from "@/lib/head";
import {
	type PublicCircleRelease,
	type PublicCircleTrack,
	publicApi,
} from "@/lib/public-api";
import {
	publicWorkStatsSimpleQueryOptions,
	publicWorkStatsStackedQueryOptions,
} from "@/lib/public-query-options";

interface CircleDetailSearchParams {
	tab?: CircleDetailTab;
}

export const Route = createFileRoute("/_public/circles_/$id")({
	validateSearch: (
		search: Record<string, unknown>,
	): CircleDetailSearchParams => ({
		tab: parseCircleDetailTab(search.tab),
	}),
	loader: async ({ params, context }) => {
		try {
			const circle = await publicApi.circles.get(params.id);

			// バックグラウンドで統計データをプリフェッチ（非ブロッキング）
			context.queryClient.prefetchQuery(
				publicWorkStatsStackedQueryOptions("circle", params.id),
			);
			context.queryClient.prefetchQuery(
				publicWorkStatsSimpleQueryOptions("circle", params.id),
			);

			return { circle };
		} catch {
			return { circle: null };
		}
	},
	head: ({ loaderData }) => createPublicCircleHead(loaderData?.circle),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: CircleDetailPage,
});

const STORAGE_KEY_VIEW = "circle-detail-view-mode";
const PAGE_SIZE = 20;

// プラットフォーム名
const platformNames: Record<string, string> = {
	twitter: "X (Twitter)",
	official: "公式サイト",
	youtube: "YouTube",
	niconico: "ニコニコ",
	booth: "BOOTH",
	bandcamp: "Bandcamp",
};

// 役割名
const roleNames: Record<string, string> = {
	arrange: "編曲",
	compose: "作曲",
	lyrics: "作詞",
	vocal: "Vo",
};

// 参加種別名
const participationTypeNames: Record<string, string> = {
	host: "主催",
	"co-host": "共催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

// タブ設定
const CIRCLE_TAB_CONFIGS: {
	key: CircleDetailTab;
	label: string;
	icon: React.ReactNode;
}[] = [
	{ key: "releases", label: TAB_LABELS.releases, icon: TabIcons.releases },
	{ key: "tracks", label: TAB_LABELS.tracks, icon: TabIcons.tracks },
	{ key: "stats", label: TAB_LABELS.stats, icon: TabIcons.stats },
];

function CircleDetailPage() {
	const { id } = Route.useParams();
	const { circle } = Route.useLoaderData();
	const { tab: activeTab = "releases" } = Route.useSearch();
	const navigate = useNavigate();
	const [viewMode, setViewModeState] = useState<ViewMode>("list");

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

	// 作品一覧の状態
	const [releases, setReleases] = useState<PublicCircleRelease[]>([]);
	const [releasesTotal, setReleasesTotal] = useState(0);
	const [releasesPage, setReleasesPage] = useState(1);
	const [releasesLoading, setReleasesLoading] = useState(false);
	const [releasesLoaded, setReleasesLoaded] = useState(false);

	// トラック一覧の状態
	const [tracks, setTracks] = useState<PublicCircleTrack[]>([]);
	const [tracksTotal, setTracksTotal] = useState(0);
	const [tracksPage, setTracksPage] = useState(1);
	const [tracksLoading, setTracksLoading] = useState(false);
	const [tracksLoaded, setTracksLoaded] = useState(false);

	// ビューモードの保存
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode;
		if (saved) setViewModeState(saved);
	}, []);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	// タブ切り替え
	const handleTabChange = (tab: CircleDetailTab) => {
		navigate({
			to: "/circles/$id",
			params: { id },
			search: { tab },
		});
	};

	// 作品一覧を取得
	const fetchReleases = useCallback(
		async (page: number) => {
			if (!circle) return;
			setReleasesLoading(true);
			try {
				const res = await publicApi.circles.releases(id, {
					page,
					limit: PAGE_SIZE,
				});
				setReleases(res.data);
				setReleasesTotal(res.total);
				setReleasesPage(page);
				setReleasesLoaded(true);
			} catch {
				// エラー時は空配列
			} finally {
				setReleasesLoading(false);
			}
		},
		[circle, id],
	);

	// トラック一覧を取得
	const fetchTracks = useCallback(
		async (page: number) => {
			if (!circle) return;
			setTracksLoading(true);
			try {
				const res = await publicApi.circles.tracks(id, {
					page,
					limit: PAGE_SIZE,
				});
				setTracks(res.data);
				setTracksTotal(res.total);
				setTracksPage(page);
				setTracksLoaded(true);
			} catch {
				// エラー時は空配列
			} finally {
				setTracksLoading(false);
			}
		},
		[circle, id],
	);

	// タブ切替時に遅延読み込み
	useEffect(() => {
		if (activeTab === "releases" && !releasesLoaded && circle) {
			fetchReleases(1);
		} else if (activeTab === "tracks" && !tracksLoaded && circle) {
			fetchTracks(1);
		}
	}, [
		activeTab,
		releasesLoaded,
		tracksLoaded,
		circle,
		fetchReleases,
		fetchTracks,
	]);

	// サークルが見つからない場合
	if (!circle) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "サークル", href: "/circles" }, { label: id }]}
				/>
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">サークルが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのサークルは存在しません
					</p>
					<Link to="/circles" preload="intent" className="btn btn-primary mt-4">
						サークル一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const releasesTotalPages = Math.ceil(releasesTotal / PAGE_SIZE);
	const tracksTotalPages = Math.ceil(tracksTotal / PAGE_SIZE);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "サークル", href: "/circles" },
					{ label: circle.name },
				]}
			/>

			{/* ヘッダー - EntityDetailHeader使用 */}
			<EntityDetailHeader
				gradientClass="gradient-circle"
				icon={<Users className="size-10 text-info sm:size-12" />}
				iconRingClass="ring-info/20"
				title={circle.name}
				subtitle={
					circle.nameJa && circle.nameJa !== circle.name
						? circle.nameJa
						: undefined
				}
				badges={
					circle.nameInitial
						? [
								<span key="initial" className="badge badge-ghost badge-sm">
									{circle.nameInitial}
								</span>,
							]
						: undefined
				}
			>
				{circle.links.length > 0 &&
					circle.links.map((link) => (
						<ExternalLink
							key={link.id}
							href={link.url}
							className="btn btn-outline btn-sm gap-1 transition-all duration-300 hover:shadow-md"
						>
							{platformNames[link.platformCode] ||
								link.platformName ||
								link.platformCode}
						</ExternalLink>
					))}
			</EntityDetailHeader>

			{/* 統計カード - StatsCardGrid使用 */}
			<StatsCardGrid
				items={
					[
						{
							label: "作品",
							value: circle.stats.releaseCount,
							icon: <Disc3 className="size-5" />,
							iconColorClass: "text-primary",
						},
						{
							label: "トラック",
							value: circle.stats.trackCount,
							icon: <Music className="size-5" />,
							iconColorClass: "text-secondary",
						},
					] satisfies StatItem[]
				}
				columns={2}
				variant="default"
			/>

			{/* タブ */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<DetailTabs
					tabs={CIRCLE_TAB_CONFIGS}
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/>
				{contentTab === "releases" && (
					<ViewToggle value={viewMode} onChange={setViewMode} />
				)}
			</div>

			{/* 作品一覧 */}
			{contentTab === "releases" && (
				<>
					{releasesLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : releases.length === 0 ? (
						<EmptyState type="empty" title="作品がありません" />
					) : viewMode === "grid" ? (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
							{releases.map((release) => (
								<Link
									key={release.id}
									to="/releases/$id"
									params={{ id: release.id }}
									preload="intent"
									className="group"
								>
									<div className="rounded-2xl bg-base-100 p-3 shadow-sm transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
										{/* ジャケット風のプレースホルダー */}
										<div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-info/20 via-primary/15 to-secondary/20">
											<div className="absolute inset-0 flex flex-col items-center justify-center p-2">
												<Disc3 className="size-8 text-info/60 sm:size-12" />
												<span className="mt-1 line-clamp-2 text-center font-medium text-base-content/70 text-xs sm:mt-2 sm:text-sm">
													{release.name}
												</span>
											</div>
											{/* 参加種別バッジ */}
											<div className="absolute top-2 right-2">
												<span
													className={`badge badge-xs ${
														release.participationType === "host"
															? "badge-primary"
															: "badge-ghost"
													}`}
												>
													{participationTypeNames[release.participationType] ||
														release.participationType}
												</span>
											</div>
										</div>
										{/* タイトル・情報 */}
										<div className="mt-2 min-h-[44px] space-y-1">
											<h3 className="line-clamp-2 font-medium text-sm leading-tight transition-colors duration-300 group-hover:text-primary">
												{release.name}
											</h3>
											<div className="flex flex-wrap items-center gap-1 text-base-content/60 text-xs">
												{release.releaseDate && (
													<span className="flex items-center gap-1">
														<Calendar className="size-3" />
														{release.releaseDate.slice(0, 4)}
													</span>
												)}
												<span className="flex items-center gap-1">
													<Music className="size-3" />
													{release.trackCount}曲
												</span>
											</div>
											{release.event && (
												<span className="badge badge-outline badge-xs">
													{release.event.name}
												</span>
											)}
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm">
							<table className="table">
								<thead>
									<tr>
										<th>タイトル</th>
										<th>イベント</th>
										<th className="hidden sm:table-cell">参加種別</th>
										<th className="hidden sm:table-cell">頒布日</th>
										<th>曲数</th>
									</tr>
								</thead>
								<tbody>
									{releases.map((release) => (
										<tr
											key={release.id}
											className="transition-colors duration-300 hover:bg-base-200/50"
										>
											<td className="min-h-[44px]">
												<Link
													to="/releases/$id"
													params={{ id: release.id }}
													preload="intent"
													className="font-medium transition-colors duration-300 hover:text-primary"
												>
													{release.name}
												</Link>
											</td>
											<td>
												{release.event ? (
													<Link
														to="/events/$id"
														params={{ id: release.event.id }}
														preload="intent"
														className="transition-colors duration-300 hover:text-primary"
													>
														{release.event.name}
													</Link>
												) : (
													"-"
												)}
											</td>
											<td className="hidden sm:table-cell">
												<span
													className={`badge badge-sm ${
														release.participationType === "host"
															? "badge-primary"
															: "badge-ghost"
													}`}
												>
													{participationTypeNames[release.participationType] ||
														release.participationType}
												</span>
											</td>
											<td className="hidden text-base-content/70 sm:table-cell">
												{release.releaseDate || "-"}
											</td>
											<td className="text-base-content/70">
												{release.trackCount}曲
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* ページネーション */}
					{releasesTotalPages > 1 && (
						<Pagination
							currentPage={releasesPage}
							totalPages={releasesTotalPages}
							onPageChange={(page) => fetchReleases(page)}
						/>
					)}
				</>
			)}

			{/* トラック一覧 */}
			{contentTab === "tracks" && (
				<>
					{tracksLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : tracks.length === 0 ? (
						<EmptyState type="empty" title="トラックがありません" />
					) : (
						<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm">
							<table className="table">
								<thead>
									<tr>
										<th>曲名</th>
										<th>作品</th>
										<th className="hidden md:table-cell">アーティスト</th>
										<th className="hidden sm:table-cell">原曲</th>
										<th className="hidden lg:table-cell">ジャンル</th>
									</tr>
								</thead>
								<tbody>
									{tracks.map((track) => (
										<tr
											key={track.id}
											className="transition-colors duration-300 hover:bg-base-200/50"
										>
											<td className="min-h-[44px]">
												<Link
													to="/tracks/$id"
													params={{ id: track.id }}
													preload="intent"
													className="font-medium transition-colors duration-300 hover:text-primary"
												>
													{track.name}
												</Link>
												{/* モバイル用ジャンル表示 */}
												{track.genres && track.genres.length > 0 && (
													<div className="mt-1 flex flex-wrap gap-1 lg:hidden">
														{track.genres.map((genre) => (
															<GenreBadge
																key={genre.code}
																code={genre.code}
																name={genre.nameJa}
																color={genre.color}
																icon={genre.icon}
															/>
														))}
													</div>
												)}
											</td>
											<td className="text-base-content/70">
												{track.releaseId ? (
													<Link
														to="/releases/$id"
														params={{ id: track.releaseId }}
														preload="intent"
														className="transition-colors duration-300 hover:text-primary"
													>
														{track.releaseName || "-"}
													</Link>
												) : (
													track.releaseName || "-"
												)}
											</td>
											<td className="hidden md:table-cell">
												<div className="flex flex-wrap gap-1">
													{track.artists.map((artist) => (
														<Link
															key={artist.artistAliasId}
															to="/artists/$id"
															params={{ id: artist.artistAliasId }}
															preload="intent"
															className="inline-flex min-h-[44px] items-center gap-1 transition-colors duration-300 hover:text-primary"
														>
															<UserRound className="size-3" />
															<span>{artist.creditName}</span>
															<span className="text-base-content/60 text-xs">
																(
																{artist.roles
																	.map((r) => roleNames[r] || r)
																	.join("/")}
																)
															</span>
														</Link>
													))}
												</div>
											</td>
											<td className="hidden sm:table-cell">
												{track.originalSong ? (
													<Link
														to="/original-songs/$id"
														params={{ id: track.originalSong.id }}
														preload="intent"
														className="text-base-content/70 transition-colors duration-300 hover:text-primary"
													>
														{track.originalSong.name}
													</Link>
												) : (
													"-"
												)}
											</td>
											<td className="hidden lg:table-cell">
												{track.genres && track.genres.length > 0 && (
													<div className="flex flex-wrap gap-1">
														{track.genres.map((genre) => (
															<GenreBadge
																key={genre.code}
																code={genre.code}
																name={genre.nameJa}
																color={genre.color}
																icon={genre.icon}
															/>
														))}
													</div>
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
							onPageChange={(page) => fetchTracks(page)}
						/>
					)}
				</>
			)}

			{/* 統計 */}
			{contentTab === "stats" &&
				(isTabTransitioning ? (
					<WorkStatsSkeleton />
				) : (
					<WorkStatsSection entityType="circle" entityId={id} />
				))}
		</div>
	);
}
