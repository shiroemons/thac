import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, Loader2, Music, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	EmptyState,
	ExternalLink,
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPublicCircleHead } from "@/lib/head";
import {
	type PublicCircleRelease,
	type PublicCircleTrack,
	publicApi,
} from "@/lib/public-api";

export const Route = createFileRoute("/_public/circles_/$id")({
	loader: async ({ params }) => {
		try {
			const circle = await publicApi.circles.get(params.id);
			return { circle };
		} catch {
			return { circle: null };
		}
	},
	head: ({ loaderData }) => createPublicCircleHead(loaderData?.circle?.name),
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

// タブ型
type TabType = "releases" | "tracks";

function CircleDetailPage() {
	const { id } = Route.useParams();
	const { circle } = Route.useLoaderData();
	const [activeTab, setActiveTab] = useState<TabType>("releases");
	const [viewMode, setViewModeState] = useState<ViewMode>("list");

	// リリース一覧の状態
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

	// リリース一覧を取得
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
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">サークルが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのサークルは存在しません
					</p>
					<Link to="/circles" className="btn btn-primary mt-4">
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

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							{/* アバター */}
							<div className="flex size-16 items-center justify-center rounded-full bg-primary/10 font-bold text-2xl text-primary">
								{circle.nameInitial || circle.name.charAt(0)}
							</div>
							<div>
								<h1 className="font-bold text-2xl sm:text-3xl">
									{circle.name}
								</h1>
								{circle.nameJa && circle.nameJa !== circle.name && (
									<p className="text-base-content/70">{circle.nameJa}</p>
								)}
							</div>
						</div>
						{circle.notes && (
							<p className="text-base-content/60 text-sm">{circle.notes}</p>
						)}
					</div>

					{/* 外部リンク */}
					{circle.links.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{circle.links.map((link) => (
								<ExternalLink
									key={link.id}
									href={link.url}
									className="btn btn-outline btn-sm gap-1"
								>
									{platformNames[link.platformCode] ||
										link.platformName ||
										link.platformCode}
								</ExternalLink>
							))}
						</div>
					)}
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-2 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(circle.stats.releaseCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(circle.stats.trackCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック</p>
					</div>
				</div>
			</div>

			{/* タブ */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div role="tablist" className="tabs tabs-boxed w-fit">
					<button
						type="button"
						role="tab"
						className={`tab ${activeTab === "releases" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("releases")}
					>
						リリース一覧
					</button>
					<button
						type="button"
						role="tab"
						className={`tab ${activeTab === "tracks" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("tracks")}
					>
						曲一覧
					</button>
				</div>
				{activeTab === "releases" && (
					<ViewToggle value={viewMode} onChange={setViewMode} />
				)}
			</div>

			{/* リリース一覧 */}
			{activeTab === "releases" && (
				<>
					{releasesLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : releases.length === 0 ? (
						<EmptyState type="empty" title="リリースがありません" />
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
										<div className="flex flex-wrap items-center gap-2 text-base-content/60 text-sm">
											{release.event && (
												<Link
													to="/events/$id"
													params={{ id: release.event.id }}
													className="badge badge-outline badge-sm hover:badge-primary"
												>
													{release.event.name}
												</Link>
											)}
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
										<th>イベント</th>
										<th className="hidden sm:table-cell">参加種別</th>
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
												{release.event ? (
													<Link
														to="/events/$id"
														params={{ id: release.event.id }}
														className="hover:text-primary"
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
						<div className="flex justify-center gap-2">
							<button
								type="button"
								className="btn btn-sm"
								disabled={releasesPage <= 1}
								onClick={() => fetchReleases(releasesPage - 1)}
							>
								前へ
							</button>
							<span className="flex items-center px-2 text-sm">
								{releasesPage} / {releasesTotalPages}
							</span>
							<button
								type="button"
								className="btn btn-sm"
								disabled={releasesPage >= releasesTotalPages}
								onClick={() => fetchReleases(releasesPage + 1)}
							>
								次へ
							</button>
						</div>
					)}
				</>
			)}

			{/* トラック一覧 */}
			{activeTab === "tracks" && (
				<>
					{tracksLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : tracks.length === 0 ? (
						<EmptyState type="empty" title="トラックがありません" />
					) : (
						<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
							<table className="table">
								<thead>
									<tr>
										<th>曲名</th>
										<th>リリース</th>
										<th className="hidden md:table-cell">アーティスト</th>
										<th className="hidden sm:table-cell">原曲</th>
									</tr>
								</thead>
								<tbody>
									{tracks.map((track) => (
										<tr key={track.id} className="hover:bg-base-200/50">
											<td>
												<div className="font-medium">{track.name}</div>
											</td>
											<td className="text-base-content/70">
												{track.releaseName || "-"}
											</td>
											<td className="hidden md:table-cell">
												<div className="flex flex-wrap gap-1">
													{track.artists.map((artist) => (
														<Link
															key={artist.id}
															to="/artists/$id"
															params={{ id: artist.id }}
															className="inline-flex items-center gap-1 hover:text-primary"
														>
															<Users className="size-3" />
															<span>{artist.creditName}</span>
															<span className="text-base-content/50 text-xs">
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
														className="text-base-content/70 hover:text-primary"
													>
														{track.originalSong.name}
													</Link>
												) : (
													"-"
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
						<div className="flex justify-center gap-2">
							<button
								type="button"
								className="btn btn-sm"
								disabled={tracksPage <= 1}
								onClick={() => fetchTracks(tracksPage - 1)}
							>
								前へ
							</button>
							<span className="flex items-center px-2 text-sm">
								{tracksPage} / {tracksTotalPages}
							</span>
							<button
								type="button"
								className="btn btn-sm"
								disabled={tracksPage >= tracksTotalPages}
								onClick={() => fetchTracks(tracksPage + 1)}
							>
								次へ
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
