import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Disc3, Loader2, MapPin, Music, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
	DetailTabs,
	EmptyState,
	EntityDetailHeader,
	PublicBreadcrumb,
	type StatItem,
	StatsCardGrid,
	TabIcons,
	type ViewMode,
	ViewToggle,
	WorkStatsSection,
	WorkStatsSkeleton,
} from "@/components/public";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import {
	type EventDetailTab,
	parseEventDetailTab,
	TAB_LABELS,
} from "@/lib/detail-tab-utils";
import { createPublicEventHead } from "@/lib/head";
import { publicApi } from "@/lib/public-api";
import {
	publicEventReleasesInfiniteQueryOptions,
	publicWorkStatsSimpleQueryOptions,
	publicWorkStatsStackedQueryOptions,
} from "@/lib/public-query-options";

interface EventDetailSearchParams {
	tab?: EventDetailTab;
}

export const Route = createFileRoute("/_public/events_/$id")({
	validateSearch: (
		search: Record<string, unknown>,
	): EventDetailSearchParams => ({
		tab: parseEventDetailTab(search.tab),
	}),
	loader: async ({ params, context }) => {
		try {
			const event = await publicApi.events.get(params.id);

			// バックグラウンドで統計データをプリフェッチ（非ブロッキング）
			context.queryClient.prefetchQuery(
				publicWorkStatsStackedQueryOptions("event", params.id),
			);
			context.queryClient.prefetchQuery(
				publicWorkStatsSimpleQueryOptions("event", params.id),
			);

			return { event };
		} catch {
			return { event: null };
		}
	},
	head: ({ loaderData }) => createPublicEventHead(loaderData?.event),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: EventDetailPage,
});

const STORAGE_KEY_VIEW = "event-detail-view-mode";
const PAGE_SIZE = 20;

// 参加種別名
const participationTypeNames: Record<string, string> = {
	host: "主催",
	"co-host": "共催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

// タブ設定
const EVENT_TAB_CONFIGS: {
	key: EventDetailTab;
	label: string;
	icon: React.ReactNode;
}[] = [
	{ key: "releases", label: TAB_LABELS.releases, icon: TabIcons.releases },
	{ key: "stats", label: TAB_LABELS.stats, icon: TabIcons.stats },
];

function EventDetailPage() {
	const { id } = Route.useParams();
	const { event } = Route.useLoaderData();
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

	// 作品一覧の無限スクロール
	const {
		data: releasesData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: releasesLoading,
	} = useInfiniteQuery({
		...publicEventReleasesInfiniteQueryOptions({
			eventId: id,
			limit: PAGE_SIZE,
		}),
		enabled: activeTab === "releases" && !!event,
	});

	// ページデータをフラット化
	const releases = releasesData?.pages.flatMap((page) => page.data) ?? [];
	const releasesTotal = releasesData?.pages[0]?.total ?? 0;

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
	const handleTabChange = (tab: EventDetailTab) => {
		navigate({
			to: "/events/$id",
			params: { id },
			search: { tab },
		});
	};

	// イベントが見つからない場合
	if (!event) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "イベント", href: "/events" }, { label: id }]}
				/>
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">イベントが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのイベントは存在しません
					</p>
					<Link to="/events" preload="intent" className="btn btn-primary mt-4">
						イベント一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	// 日程表示
	const formatDateRange = () => {
		if (!event.startDate) return null;
		if (event.startDate === event.endDate || !event.endDate) {
			return event.startDate;
		}
		return `${event.startDate} 〜 ${event.endDate}`;
	};

	// バッジを構築
	const headerBadges: React.ReactNode[] = [];

	// 日程バッジ
	const dateRange = formatDateRange();
	if (dateRange) {
		headerBadges.push(
			<span
				key="date"
				className="badge badge-warning badge-outline flex items-center gap-1"
			>
				<Calendar className="size-3" />
				{dateRange}
			</span>,
		);
	}

	// 会場バッジ
	if (event.venue) {
		headerBadges.push(
			<span key="venue" className="badge badge-ghost flex items-center gap-1">
				<MapPin className="size-3" />
				{event.venue}
			</span>,
		);
	}

	// 開催日数バッジ
	if (event.totalDays) {
		headerBadges.push(
			<span key="days" className="badge badge-outline">
				{event.totalDays}日間
			</span>,
		);
	}

	// イベント日バッジ
	for (const day of event.eventDays) {
		headerBadges.push(
			<span key={day.id} className="badge badge-ghost">
				{day.dayNumber}日目: {day.date}
			</span>,
		);
	}

	// 統計項目
	const statsItems: StatItem[] = [
		{
			label: "サークル",
			value: event.stats.circleCount,
			icon: <Users className="size-5" />,
			iconColorClass: "text-primary",
		},
		{
			label: "作品",
			value: event.stats.releaseCount,
			icon: <Disc3 className="size-5" />,
			iconColorClass: "text-secondary",
		},
		{
			label: "トラック",
			value: event.stats.trackCount,
			icon: <Music className="size-5" />,
			iconColorClass: "text-accent",
		},
	];

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "イベント", href: "/events" }, { label: event.name }]}
			/>

			{/* ヘッダー */}
			<EntityDetailHeader
				gradientClass="gradient-event"
				icon={<Calendar className="size-10 text-warning sm:size-12" />}
				iconRingClass="ring-warning/20"
				title={event.name}
				subtitle={event.eventSeriesName ?? undefined}
				badges={headerBadges.length > 0 ? headerBadges : undefined}
			/>

			{/* 統計カード */}
			<StatsCardGrid items={statsItems} columns={3} />

			{/* タブ */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<DetailTabs
					tabs={EVENT_TAB_CONFIGS}
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
						<EmptyState type="empty" title="頒布物がありません" />
					) : viewMode === "grid" ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{releases.map((release) => (
								<div
									key={release.id}
									className="card bg-base-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
								>
									<div className="card-body p-4">
										<Link
											to="/releases/$id"
											params={{ id: release.id }}
											preload="intent"
											className="card-title text-base hover:text-primary"
										>
											{release.name}
										</Link>
										<div className="flex flex-wrap gap-1">
											{release.circles.map((circle) => (
												<Link
													key={circle.id}
													to="/circles/$id"
													params={{ id: circle.id }}
													preload="intent"
													className="badge badge-outline badge-sm hover:badge-primary"
												>
													{circle.name}
													{circle.participationType !== "host" && (
														<span className="ml-1 text-xs opacity-70">
															(
															{participationTypeNames[circle.participationType]}
															)
														</span>
													)}
												</Link>
											))}
										</div>
										<div className="mt-2 flex items-center gap-4 text-base-content/60 text-sm">
											{release.releaseDate && (
												<span className="flex items-center gap-1">
													<Calendar className="size-3" />
													{release.releaseDate}
												</span>
											)}
											<span className="flex items-center gap-1">
												<Music className="size-3" />
												{release.trackCount}曲
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm">
							<table className="table">
								<thead>
									<tr>
										<th>タイトル</th>
										<th>サークル</th>
										<th className="hidden sm:table-cell">頒布日</th>
										<th>曲数</th>
									</tr>
								</thead>
								<tbody>
									{releases.map((release) => (
										<tr key={release.id} className="hover:bg-base-200/50">
											<td>
												<Link
													to="/releases/$id"
													params={{ id: release.id }}
													preload="intent"
													className="font-medium hover:text-primary"
												>
													{release.name}
												</Link>
											</td>
											<td>
												{release.circles.map((circle, idx) => (
													<span key={circle.id}>
														{idx > 0 && ", "}
														<Link
															to="/circles/$id"
															params={{ id: circle.id }}
															preload="intent"
															className="hover:text-primary"
														>
															{circle.name}
														</Link>
													</span>
												))}
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

					{/* 無限スクロール */}
					<InfiniteScroll
						onLoadMore={fetchNextPage}
						isLoading={isFetchingNextPage}
						hasMore={hasNextPage ?? false}
						loadedCount={releases.length}
						totalCount={releasesTotal}
					/>
				</>
			)}

			{/* 統計 */}
			{contentTab === "stats" &&
				(isTabTransitioning ? (
					<WorkStatsSkeleton />
				) : (
					<WorkStatsSection entityType="event" entityId={id} />
				))}
		</div>
	);
}
