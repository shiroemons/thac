import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, Music, Users } from "lucide-react";
import { useMemo } from "react";
import {
	EmptyState,
	EntityDetailHeader,
	GenreBadgeList,
	PublicationLinks,
	PublicBreadcrumb,
	type StatItem,
	StatsCardGrid,
} from "@/components/public";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPublicReleaseHead } from "@/lib/head";
import { type PublicReleaseDetail, publicApi } from "@/lib/public-api";

// 参加形態の表示名マッピング
const participationTypeNames: Record<string, string> = {
	host: "主催",
	"co-host": "共催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

// 参加形態のバッジカラーマッピング
const participationTypeBadgeColors: Record<string, string> = {
	host: "badge-primary",
	"co-host": "badge-secondary",
	participant: "badge-ghost",
	guest: "badge-outline",
	split_partner: "badge-accent",
};

// 作品タイプの表示名マッピング
const releaseTypeNames: Record<string, string> = {
	album: "アルバム",
	single: "シングル",
	ep: "EP",
	digital: "デジタル",
	video: "映像作品",
};

// 作品タイプのバッジカラーマッピング
const releaseTypeBadgeColors: Record<string, string> = {
	album: "badge-primary",
	single: "badge-secondary",
	ep: "badge-accent",
	digital: "badge-info",
	video: "badge-warning",
};

export const Route = createFileRoute("/_public/releases_/$id")({
	loader: async ({ params }) => {
		try {
			const release = await publicApi.releases.get(params.id);
			return { release };
		} catch {
			return { release: null };
		}
	},
	head: ({ loaderData }) => createPublicReleaseHead(loaderData?.release),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: ReleaseDetailPage,
});

function ReleaseDetailPage() {
	const { id } = Route.useParams();
	const { release } = Route.useLoaderData();

	// ディスクごとにトラックをグループ化
	const tracksByDisc = useMemo(() => {
		if (!release)
			return new Map<string | null, PublicReleaseDetail["tracks"]>();

		const grouped = new Map<string | null, PublicReleaseDetail["tracks"]>();
		for (const track of release.tracks) {
			const key = track.discId;
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)?.push(track);
		}
		return grouped;
	}, [release]);

	// マルチディスクかどうか
	const isMultiDisc = release ? release.discs.length > 1 : false;

	// 作品が見つからない場合
	if (!release) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb items={[{ label: "作品" }, { label: id }]} />
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">作品が見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDの作品は存在しません
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "作品" }, { label: release.name }]} />

			{/* ヘッダー - EntityDetailHeader + StatsCardGrid */}
			<EntityDetailHeader
				gradientClass="gradient-release"
				icon={<Disc3 className="size-10 text-primary/80 sm:size-12" />}
				iconRingClass="ring-primary/20"
				title={release.name}
				badges={
					release.releaseType
						? [
								<span
									key="releaseType"
									className={`badge ${releaseTypeBadgeColors[release.releaseType] ?? "badge-ghost"}`}
								>
									{releaseTypeNames[release.releaseType] ?? release.releaseType}
								</span>,
							]
						: undefined
				}
			>
				{/* サークル一覧 */}
				{release.circles.length > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						{release.circles
							.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
							.map((circle, idx) => (
								<CircleBadge
									key={`${circle.circleId}-${idx}`}
									circle={circle}
								/>
							))}
					</div>
				)}

				{/* イベント・頒布日 */}
				<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
					{release.event && (
						<Link
							to="/events/$id"
							params={{ id: release.event.id }}
							preload="intent"
							className="flex min-h-11 items-center gap-1 rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-base-200/50 hover:text-primary"
						>
							<Calendar className="size-4" />
							{release.event.name}
						</Link>
					)}
					{release.releaseDate && (
						<span className="flex items-center gap-1">
							<Calendar className="size-4" />
							{release.releaseDate}
						</span>
					)}
				</div>
			</EntityDetailHeader>

			{/* ジャンル */}
			{release.genres && release.genres.length > 0 && (
				<div className="mt-4">
					<GenreBadgeList genres={release.genres} />
				</div>
			)}

			{/* 統計カード */}
			<StatsCardGrid
				items={
					[
						{
							label: "トラック数",
							value: release.trackCount,
							icon: <Music className="size-5" />,
							iconColorClass: "text-primary",
						},
						{
							label: "参加アーティスト",
							value: release.artistCount,
							icon: <Users className="size-5" />,
							iconColorClass: "text-secondary",
						},
					] satisfies StatItem[]
				}
				columns={2}
			/>

			{/* トラックリスト */}
			<div className="space-y-4">
				<h2 className="flex items-center gap-2 font-bold text-xl">
					<Music className="size-5 text-primary" />
					トラックリスト
				</h2>

				{release.tracks.length > 0 ? (
					<div className="space-y-4">
						{isMultiDisc ? (
							// マルチディスク: ディスクごとにグループ化
							release.discs.map((disc) => (
								<div
									key={disc.id}
									className="overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-md"
								>
									<div className="gradient-track">
										<div className="glass-card-light border-base-200 border-b px-4 py-3">
											<div className="flex items-center gap-2">
												<Disc3 className="size-5 text-primary" />
												<span className="font-semibold">
													Disc {disc.discNumber}
													{disc.discName && ` - ${disc.discName}`}
												</span>
											</div>
										</div>
									</div>
									<div className="bg-base-100">
										<TrackCardList tracks={tracksByDisc.get(disc.id) ?? []} />
									</div>
								</div>
							))
						) : (
							// シングルディスク: そのまま表示
							<div className="rounded-2xl bg-base-100 shadow-sm">
								<TrackCardList tracks={release.tracks} />
							</div>
						)}
					</div>
				) : (
					<EmptyState
						type="empty"
						title="トラックがありません"
						description="この作品にはまだトラックが登録されていません"
					/>
				)}
			</div>

			{/* 配信リンク */}
			{release.publications.length > 0 && (
				<div className="rounded-2xl bg-base-100 p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
					<PublicationLinks publications={release.publications} showEmbeds />
				</div>
			)}

			{/* メモ */}
			{release.notes && (
				<div className="space-y-3">
					<h2 className="font-bold text-xl">メモ</h2>
					<div className="rounded-2xl bg-base-100 p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
						<p className="whitespace-pre-wrap text-base-content/80">
							{release.notes}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * サークルバッジコンポーネント
 */
function CircleBadge({
	circle,
}: {
	circle: PublicReleaseDetail["circles"][number];
}) {
	return (
		<Link
			to="/circles/$id"
			params={{ id: circle.circleId }}
			preload="intent"
			className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-base-200/50 hover:text-primary"
		>
			<span className="font-medium">{circle.circleName}</span>
			<span
				className={`badge badge-sm ${participationTypeBadgeColors[circle.participationType] ?? "badge-ghost"}`}
			>
				{participationTypeNames[circle.participationType] ??
					circle.participationType}
			</span>
		</Link>
	);
}

/**
 * トラックカードリストコンポーネント
 */
function TrackCardList({ tracks }: { tracks: PublicReleaseDetail["tracks"] }) {
	return (
		<div className="divide-y divide-base-200">
			{tracks
				.sort((a, b) => a.trackNumber - b.trackNumber)
				.map((track) => (
					<Link
						key={track.id}
						to="/tracks/$id"
						params={{ id: track.id }}
						preload="intent"
						className="group flex min-h-16 items-start gap-3 p-4 transition-colors duration-300 hover:bg-base-200/50 sm:min-h-14 sm:items-center"
					>
						{/* トラック番号バッジ */}
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-bold font-mono text-primary-content transition-all duration-300 group-hover:bg-primary group-hover:text-primary-content sm:size-9">
							{track.trackNumber.toString().padStart(2, "0")}
						</div>

						{/* トラック情報 */}
						<div className="min-w-0 flex-1">
							{/* 曲名 */}
							<p className="font-medium transition-colors duration-300 group-hover:text-primary">
								{track.name}
							</p>

							{/* アーティスト・原曲情報 */}
							<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base-content/60 text-sm">
								{/* アーティスト */}
								{track.credits.length > 0 && (
									<span className="flex items-center gap-1">
										{track.credits.slice(0, 2).map((credit, idx) => {
											const displayName =
												credit.creditName ||
												credit.aliasName ||
												credit.artistName ||
												"Unknown";
											return (
												<span key={credit.artistAliasId}>
													{idx > 0 && ", "}
													{displayName}
												</span>
											);
										})}
										{track.credits.length > 2 && (
											<span className="text-xs">
												{" "}
												他{track.credits.length - 2}名
											</span>
										)}
									</span>
								)}

								{/* 原曲 */}
								{track.officialSongs.length > 0 && (
									<span className="flex items-center gap-1 text-xs">
										<span className="opacity-60">原曲:</span>
										{track.officialSongs.slice(0, 1).map((os) => (
											<span key={os.officialSongId ?? os.songName}>
												{os.songName}
											</span>
										))}
										{track.officialSongs.length > 1 && (
											<span> 他{track.officialSongs.length - 1}曲</span>
										)}
									</span>
								)}
							</div>

							{/* ジャンル */}
							{track.genres && track.genres.length > 0 && (
								<div className="mt-1.5">
									<GenreBadgeList genres={track.genres} />
								</div>
							)}
						</div>
					</Link>
				))}
		</div>
	);
}
