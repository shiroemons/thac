import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Disc3,
	ExternalLink,
	Mic,
	Music,
	TrendingUp,
	Users,
} from "lucide-react";
import { useMemo } from "react";
import { PublicBreadcrumb } from "@/components/public";
import {
	getArrangeCount,
	getMockArrangeTracks,
	getSongById,
	getSongsByWorkId,
	getWorkById,
} from "@/mocks/official";

export const Route = createFileRoute("/_public/original-songs_/$id")({
	component: OriginalSongDetailPage,
});

// 外部リンクデータ型（モック）
interface OfficialSongLink {
	id: string;
	officialSongId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
}

// モックデータ - 外部リンク
const mockSongLinks: Record<string, OfficialSongLink[]> = {
	"02010015": [
		{
			id: "sl-1",
			officialSongId: "02010015",
			platformCode: "youtube",
			url: "https://www.youtube.com/results?search_query=U.N.%E3%82%AA%E3%83%BC%E3%82%A8%E3%83%B3%E3%81%AF%E5%BD%BC%E5%A5%B3%E3%81%AA%E3%81%AE%E3%81%8B",
			sortOrder: 1,
		},
		{
			id: "sl-2",
			officialSongId: "02010015",
			platformCode: "thwiki",
			url: "https://thwiki.cc/U.N.%E3%82%AA%E3%83%BC%E3%82%A8%E3%83%B3%E3%81%AF%E5%BD%BC%E5%A5%B3%E3%81%AA%E3%81%AE%E3%81%8B%EF%BC%9F",
			sortOrder: 2,
		},
	],
	"02010013": [
		{
			id: "sl-3",
			officialSongId: "02010013",
			platformCode: "youtube",
			url: "https://www.youtube.com/results?search_query=%E4%BA%A1%E3%81%8D%E7%8E%8B%E5%A5%B3%E3%81%AE%E7%82%BA%E3%81%AE%E3%82%BB%E3%83%97%E3%83%86%E3%83%83%E3%83%88",
			sortOrder: 1,
		},
	],
};

// プラットフォーム名
const platformNames: Record<string, string> = {
	youtube: "YouTube",
	thwiki: "東方Wiki",
	niconico: "ニコニコ動画",
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

	// 共有モックデータから取得
	const song = getSongById(id);
	const work = song ? getWorkById(song.productId) : undefined;
	const arrangeCount = song ? getArrangeCount(song.id) : 0;
	const links = mockSongLinks[id] || [];
	const arranges = getMockArrangeTracks(id);

	// 一意のサークル数・アーティスト数を計算
	const circleCount = new Set(
		arranges.flatMap((arr) => arr.circles.map((c) => c.id)),
	).size;
	const artistCount = new Set(
		arranges.flatMap((arr) => arr.artists.map((a) => a.id)),
	).size;

	// 同作品の他の楽曲（ナビゲーション用）
	const siblingNavigation = useMemo(() => {
		if (!song || !work) return { prev: undefined, next: undefined };

		const workSongs = getSongsByWorkId(work.id);
		const currentIndex = workSongs.findIndex((s) => s.id === song.id);

		return {
			prev: currentIndex > 0 ? workSongs[currentIndex - 1] : undefined,
			next:
				currentIndex < workSongs.length - 1
					? workSongs[currentIndex + 1]
					: undefined,
		};
	}, [song, work]);

	// 曲が見つからない場合
	if (!song || !work) {
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

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "原曲", href: "/original-songs" },
					{
						label: work.shortName,
						href: `/original-songs?type=${work.productType}&work=${work.id}`,
					},
					{ label: song.name },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="badge badge-outline badge-lg">
								Track {song.trackNumber.toString().padStart(2, "0")}
							</span>
							<h1 className="font-bold text-2xl sm:text-3xl">{song.name}</h1>
						</div>
						<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
							<Link
								to="/official-works/$id"
								params={{ id: work.id }}
								className="flex items-center gap-1 hover:text-primary"
							>
								<Disc3 className="size-4" />
								{work.name}
							</Link>
							{song.composer && (
								<span className="flex items-center gap-1">
									<Music className="size-4" />
									作曲: {song.composer}
								</span>
							)}
						</div>
					</div>

					{/* 外部リンク */}
					{links.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{links.map((link) => (
								<a
									key={link.id}
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									className="btn btn-outline btn-sm gap-1"
								>
									<ExternalLink className="size-3" />
									{platformNames[link.platformCode] || link.platformCode}
								</a>
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
								{arrangeCount.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アレンジ数</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Users className="size-5" />
							<span className="font-bold text-2xl">
								{circleCount.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">サークル数</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Mic className="size-5" />
							<span className="font-bold text-2xl">
								{artistCount.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アーティスト数</p>
					</div>
				</div>
			</div>

			{/* 前後の楽曲ナビゲーション */}
			<div className="flex items-center justify-between gap-4">
				{siblingNavigation.prev ? (
					<Link
						to="/original-songs/$id"
						params={{ id: siblingNavigation.prev.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<ChevronLeft className="size-4" />
						<span className="hidden sm:inline">
							{siblingNavigation.prev.name}
						</span>
						<span className="sm:hidden">前の曲</span>
					</Link>
				) : (
					<div />
				)}
				{siblingNavigation.next ? (
					<Link
						to="/original-songs/$id"
						params={{ id: siblingNavigation.next.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<span className="hidden sm:inline">
							{siblingNavigation.next.name}
						</span>
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
				{arranges.length > 0 ? (
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
								{arranges.map((arrange) => (
									<tr key={arrange.trackId} className="hover:bg-base-200/50">
										<td>
											<div className="font-medium">{arrange.trackName}</div>
											<div className="text-base-content/60 text-sm">
												{arrange.release.name}
											</div>
										</td>
										<td>
											{arrange.circles.map((circle, idx) => (
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
												{arrange.artists.map((artist) => (
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
										<td className="hidden text-base-content/70 sm:table-cell">
											{arrange.release.releaseDate && (
												<span className="flex items-center gap-1">
													<Calendar className="size-3" />
													{arrange.release.releaseDate}
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
