import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, Loader2, MapPin, Music, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPublicEventHead } from "@/lib/head";
import { type PublicEventRelease, publicApi } from "@/lib/public-api";

export const Route = createFileRoute("/_public/events_/$id")({
	loader: async ({ params }) => {
		try {
			const event = await publicApi.events.get(params.id);
			return { event };
		} catch {
			return { event: null };
		}
	},
	head: ({ loaderData }) => createPublicEventHead(loaderData?.event?.name),
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

function EventDetailPage() {
	const { id } = Route.useParams();
	const { event } = Route.useLoaderData();
	const [viewMode, setViewModeState] = useState<ViewMode>("list");

	// リリース一覧の状態
	const [releases, setReleases] = useState<PublicEventRelease[]>([]);
	const [releasesTotal, setReleasesTotal] = useState(0);
	const [releasesPage, setReleasesPage] = useState(1);
	const [releasesLoading, setReleasesLoading] = useState(false);
	const [releasesLoaded, setReleasesLoaded] = useState(false);

	// ビューモードの保存
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode;
		if (saved) setViewModeState(saved);
	}, []);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	// リリース一覧を取得
	const fetchReleases = useCallback(
		async (page: number) => {
			if (!event) return;
			setReleasesLoading(true);
			try {
				const res = await publicApi.events.releases(id, {
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
		[event, id],
	);

	// 初回読み込み
	useEffect(() => {
		if (!releasesLoaded && event) {
			fetchReleases(1);
		}
	}, [releasesLoaded, event, fetchReleases]);

	// イベントが見つからない場合
	if (!event) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "イベント", href: "/events" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">イベントが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのイベントは存在しません
					</p>
					<Link to="/events" className="btn btn-primary mt-4">
						イベント一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const releasesTotalPages = Math.ceil(releasesTotal / PAGE_SIZE);

	// 日程表示
	const formatDateRange = () => {
		if (!event.startDate) return null;
		if (event.startDate === event.endDate || !event.endDate) {
			return event.startDate;
		}
		return `${event.startDate} 〜 ${event.endDate}`;
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "イベント", href: "/events" }, { label: event.name }]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="space-y-3">
					<div>
						{event.eventSeriesName && (
							<p className="text-base-content/60 text-sm">
								{event.eventSeriesName}
							</p>
						)}
						<h1 className="font-bold text-2xl sm:text-3xl">{event.name}</h1>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-base-content/70">
						{formatDateRange() && (
							<span className="flex items-center gap-1">
								<Calendar className="size-4" />
								{formatDateRange()}
							</span>
						)}
						{event.venue && (
							<span className="flex items-center gap-1">
								<MapPin className="size-4" />
								{event.venue}
							</span>
						)}
						{event.totalDays && (
							<span className="badge badge-outline">{event.totalDays}日間</span>
						)}
					</div>

					{/* イベント日 */}
					{event.eventDays.length > 0 && (
						<div className="flex flex-wrap gap-2 pt-2">
							{event.eventDays.map((day) => (
								<span key={day.id} className="badge badge-ghost">
									{day.dayNumber}日目: {day.date}
								</span>
							))}
						</div>
					)}
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-3 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(event.stats.releaseCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Users className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(event.stats.circleCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">サークル</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-accent">
							<Music className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(event.stats.trackCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック</p>
					</div>
				</div>
			</div>

			{/* ビュー切替 */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="font-bold text-xl">リリース一覧</h2>
				<ViewToggle value={viewMode} onChange={setViewMode} />
			</div>

			{/* リリース一覧 */}
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
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<Link
									to="/releases/$id"
									params={{ id: release.id }}
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
											className="badge badge-outline badge-sm hover:badge-primary"
										>
											{circle.name}
											{circle.participationType !== "host" && (
												<span className="ml-1 text-xs opacity-70">
													({participationTypeNames[circle.participationType]})
												</span>
											)}
										</Link>
									))}
								</div>
								<div className="mt-2 flex items-center gap-4 text-base-content/50 text-sm">
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
				<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
					<table className="table">
						<thead>
							<tr>
								<th>タイトル</th>
								<th>サークル</th>
								<th className="hidden sm:table-cell">発売日</th>
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

			{/* ページネーション */}
			{releasesTotalPages > 1 && (
				<Pagination
					currentPage={releasesPage}
					totalPages={releasesTotalPages}
					onPageChange={fetchReleases}
				/>
			)}
		</div>
	);
}
