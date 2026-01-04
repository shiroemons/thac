import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, Music, Users } from "lucide-react";
import { useMemo } from "react";
import {
	EmptyState,
	PublicationLinks,
	PublicBreadcrumb,
} from "@/components/public";
import { createPublicReleaseHead } from "@/lib/head";
import { getPublicationsForRelease } from "@/mocks/publication";
import { getReleaseWithDetails } from "@/mocks/release";
import {
	participationTypeBadgeColors,
	participationTypeNames,
	type ReleaseCircle,
	releaseTypeBadgeColors,
	releaseTypeNames,
	type TrackWithCredits,
} from "@/types/release";

export const Route = createFileRoute("/_public/releases_/$id")({
	loader: ({ params }) => ({ release: getReleaseWithDetails(params.id) }),
	head: ({ loaderData }) => createPublicReleaseHead(loaderData?.release?.name),
	component: ReleaseDetailPage,
});

function ReleaseDetailPage() {
	const { id } = Route.useParams();
	const { release } = Route.useLoaderData();

	// 配信リンクを取得
	const publications = getPublicationsForRelease(id);

	// ディスクごとにトラックをグループ化
	const tracksByDisc = useMemo(() => {
		if (!release) return new Map<string | null, TrackWithCredits[]>();

		const grouped = new Map<string | null, TrackWithCredits[]>();
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

	// リリースが見つからない場合
	if (!release) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "リリース", href: "/releases" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">リリースが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのリリースは存在しません
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "リリース", href: "/releases" },
					{ label: release.name },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-3">
						{/* リリースタイプバッジとタイトル */}
						<div className="flex flex-wrap items-center gap-2">
							{release.releaseType && (
								<span
									className={`badge ${releaseTypeBadgeColors[release.releaseType]}`}
								>
									{releaseTypeNames[release.releaseType]}
								</span>
							)}
							<h1 className="font-bold text-2xl sm:text-3xl">{release.name}</h1>
						</div>

						{/* サークル一覧 */}
						{release.circles.length > 0 && (
							<div className="flex flex-wrap items-center gap-2">
								{release.circles
									.sort((a, b) => a.position - b.position)
									.map((circle, idx) => (
										<CircleBadge
											key={`${circle.circleId}-${idx}`}
											circle={circle}
										/>
									))}
							</div>
						)}

						{/* イベント・発売日 */}
						<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
							{release.event && (
								<Link
									to="/events/$id"
									params={{ id: release.event.id }}
									className="flex items-center gap-1 hover:text-primary"
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
					</div>
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-2 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">{release.trackCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック数</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Users className="size-5" />
							<span className="font-bold text-2xl">{release.artistCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">
							参加アーティスト
						</p>
					</div>
				</div>
			</div>

			{/* トラックリスト */}
			<div className="space-y-4">
				<h2 className="font-bold text-xl">トラックリスト</h2>

				{release.tracks.length > 0 ? (
					<div className="space-y-4">
						{isMultiDisc ? (
							// マルチディスク: ディスクごとにグループ化
							release.discs.map((disc) => (
								<div
									key={disc.id}
									className="overflow-hidden rounded-lg bg-base-100 shadow-sm"
								>
									<div className="border-base-200 border-b bg-base-200/30 px-4 py-3">
										<div className="flex items-center gap-2">
											<Disc3 className="size-4 text-primary" />
											<span className="font-medium">
												Disc {disc.discNumber}
												{disc.discName && ` - ${disc.discName}`}
											</span>
										</div>
									</div>
									<TrackTable tracks={tracksByDisc.get(disc.id) ?? []} />
								</div>
							))
						) : (
							// シングルディスク: そのまま表示
							<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
								<TrackTable tracks={release.tracks} />
							</div>
						)}
					</div>
				) : (
					<EmptyState
						type="empty"
						title="トラックがありません"
						description="このリリースにはまだトラックが登録されていません"
					/>
				)}
			</div>

			{/* 配信リンク */}
			{publications.length > 0 && (
				<div className="rounded-lg bg-base-100 p-6 shadow-sm">
					<PublicationLinks publications={publications} showEmbeds />
				</div>
			)}

			{/* メモ */}
			{release.notes && (
				<div className="space-y-2">
					<h2 className="font-bold text-xl">メモ</h2>
					<div className="rounded-lg bg-base-100 p-4 shadow-sm">
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
function CircleBadge({ circle }: { circle: ReleaseCircle }) {
	return (
		<Link
			to="/circles/$id"
			params={{ id: circle.circleId }}
			className="inline-flex items-center gap-1 hover:opacity-80"
		>
			<span className="font-medium hover:text-primary">
				{circle.circleName}
			</span>
			<span
				className={`badge badge-sm ${participationTypeBadgeColors[circle.participationType]}`}
			>
				{participationTypeNames[circle.participationType]}
			</span>
		</Link>
	);
}

/**
 * トラックテーブルコンポーネント
 */
function TrackTable({ tracks }: { tracks: TrackWithCredits[] }) {
	return (
		<table className="table">
			<thead>
				<tr>
					<th className="w-12">#</th>
					<th>曲名</th>
					<th className="hidden md:table-cell">アーティスト</th>
					<th className="hidden sm:table-cell">原曲</th>
				</tr>
			</thead>
			<tbody>
				{tracks
					.sort((a, b) => a.trackNumber - b.trackNumber)
					.map((track) => (
						<tr key={track.id} className="hover:bg-base-200/50">
							<td className="font-mono text-base-content/60">
								{track.trackNumber.toString().padStart(2, "0")}
							</td>
							<td>
								<Link
									to="/tracks/$id"
									params={{ id: track.id }}
									className="font-medium hover:text-primary"
								>
									{track.name}
								</Link>
							</td>
							<td className="hidden md:table-cell">
								<div className="flex flex-wrap gap-1">
									{track.credits.slice(0, 3).map((credit, idx) => (
										<span key={credit.artistId}>
											{idx > 0 && ", "}
											<Link
												to="/artists/$id"
												params={{ id: credit.artistId }}
												className="hover:text-primary"
											>
												{credit.creditName}
											</Link>
											{credit.roles.length > 0 && (
												<span className="text-base-content/50 text-xs">
													({credit.roles.map((r) => r.roleName).join("/")})
												</span>
											)}
										</span>
									))}
									{track.credits.length > 3 && (
										<span className="text-base-content/50 text-xs">
											他{track.credits.length - 3}名
										</span>
									)}
								</div>
							</td>
							<td className="hidden sm:table-cell">
								{track.officialSongs.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{track.officialSongs.slice(0, 2).map((os, idx) => (
											<span key={os.officialSongId ?? idx}>
												{idx > 0 && ", "}
												{os.officialSongId ? (
													<Link
														to="/original-songs/$id"
														params={{ id: os.officialSongId }}
														className="hover:text-primary"
													>
														{os.songName}
													</Link>
												) : (
													<span>{os.songName}</span>
												)}
											</span>
										))}
										{track.officialSongs.length > 2 && (
											<span className="text-base-content/50 text-xs">
												他{track.officialSongs.length - 2}曲
											</span>
										)}
									</div>
								) : (
									<span className="text-base-content/40">-</span>
								)}
							</td>
						</tr>
					))}
			</tbody>
		</table>
	);
}
