import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Disc3,
	ExternalLink as ExternalLinkIcon,
	Mic,
	Music,
	TrendingUp,
	Users,
} from "lucide-react";
import { ExternalLink, PublicBreadcrumb } from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPublicOriginalSongHead } from "@/lib/head";
import {
	type PublicArrangeTrack,
	type PublicSongDetail,
	publicApi,
} from "@/lib/public-api";

export const Route = createFileRoute("/_public/original-songs_/$id")({
	loader: async ({ params }) => {
		try {
			const [song, tracksRes] = await Promise.all([
				publicApi.songs.get(params.id),
				publicApi.songs.tracks(params.id, { limit: 50 }),
			]);
			return { song, tracks: tracksRes.data, totalTracks: tracksRes.total };
		} catch {
			return { song: null, tracks: [], totalTracks: 0 };
		}
	},
	head: ({ loaderData }) =>
		createPublicOriginalSongHead(loaderData?.song?.nameJa),
	component: OriginalSongDetailPage,
});

// プラットフォーム名
const platformNames: Record<string, string> = {
	youtube: "YouTube",
	thwiki: "東方Wiki",
	niconico: "ニコニコ動画",
	nicovideo: "ニコニコ動画",
	official: "公式",
};

// 役割名
const roleNames: Record<string, string> = {
	arrange: "編曲",
	compose: "作曲",
	lyrics: "作詞",
	vocal: "Vo",
	guitar: "Gt",
	bass: "Ba",
	drums: "Dr",
};

function OriginalSongDetailPage() {
	const { id } = Route.useParams();
	const { song, tracks } = Route.useLoaderData() as {
		song: PublicSongDetail | null;
		tracks: PublicArrangeTrack[];
		totalTracks: number;
	};

	// 曲が見つからない場合
	if (!song) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "原曲", href: "/original-songs" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">曲が見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDの曲は存在しません
					</p>
					<Link to="/original-songs" className="btn btn-primary mt-4">
						原曲一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const work = song.work;
	const workDisplayName = work?.shortNameJa ?? work?.name ?? "不明";

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "原曲", href: "/original-songs" },
					...(work
						? [
								{
									label: workDisplayName,
									href: `/original-songs?type=${work.categoryCode}&open=${work.id}`,
								},
							]
						: []),
					{ label: song.nameJa },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							{song.trackNumber != null && (
								<span className="badge badge-outline badge-lg">
									Track {song.trackNumber.toString().padStart(2, "0")}
								</span>
							)}
							<h1 className="font-bold text-2xl sm:text-3xl">{song.nameJa}</h1>
						</div>
						<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
							{work && (
								<Link
									to="/official-works/$id"
									params={{ id: work.id }}
									className="flex items-center gap-1 hover:text-primary"
								>
									<Disc3 className="size-4" />
									{work.name}
								</Link>
							)}
							{song.composerName && (
								<span className="flex items-center gap-1">
									<Music className="size-4" />
									作曲: {song.composerName}
								</span>
							)}
						</div>
					</div>

					{/* 外部リンク */}
					{song.links.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{song.links.map((link) => (
								<ExternalLink
									key={`${link.platformCode}-${link.url}`}
									href={link.url}
									className="btn btn-outline btn-sm gap-1"
								>
									<ExternalLinkIcon className="size-3" />
									{link.platformName ||
										platformNames[link.platformCode] ||
										link.platformCode}
								</ExternalLink>
							))}
						</div>
					)}
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-3 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<TrendingUp className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(song.arrangeCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アレンジ数</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Users className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(song.circleCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">サークル数</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Mic className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(song.artistCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アーティスト数</p>
					</div>
				</div>
			</div>

			{/* 前後の楽曲ナビゲーション */}
			<div className="flex items-center justify-between gap-4">
				{song.prevSong.id ? (
					<Link
						to="/original-songs/$id"
						params={{ id: song.prevSong.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<ChevronLeft className="size-4" />
						<span className="hidden sm:inline">{song.prevSong.name}</span>
						<span className="sm:hidden">前の曲</span>
					</Link>
				) : (
					<div />
				)}
				{song.nextSong.id ? (
					<Link
						to="/original-songs/$id"
						params={{ id: song.nextSong.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<span className="hidden sm:inline">{song.nextSong.name}</span>
						<span className="sm:hidden">次の曲</span>
						<ChevronRight className="size-4" />
					</Link>
				) : (
					<div />
				)}
			</div>

			{/* アレンジ一覧 */}
			<div className="space-y-4">
				<h2 className="font-bold text-xl">アレンジ一覧</h2>
				{tracks.length > 0 ? (
					<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>タイトル</th>
									<th>サークル</th>
									<th className="hidden md:table-cell">アーティスト</th>
									<th className="hidden sm:table-cell">発売日</th>
								</tr>
							</thead>
							<tbody>
								{tracks.map((track) => (
									<tr key={track.trackId} className="hover:bg-base-200/50">
										<td>
											<div className="font-medium">{track.trackName}</div>
											{track.release && (
												<div className="text-base-content/60 text-sm">
													{track.release.name}
												</div>
											)}
										</td>
										<td>
											{track.circles.map((circle, idx) => (
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
														{artist.roles.length > 0 && (
															<span className="text-base-content/50 text-xs">
																(
																{artist.roles
																	.map((r) => roleNames[r] || r)
																	.join("/")}
																)
															</span>
														)}
													</Link>
												))}
											</div>
										</td>
										<td className="hidden text-base-content/70 sm:table-cell">
											{track.release?.releaseDate && (
												<span className="flex items-center gap-1">
													<Calendar className="size-3" />
													{track.release.releaseDate}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
						<p className="text-base-content/70">
							アレンジ情報はまだ登録されていません
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
