import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Disc3,
	ExternalLink,
	Music,
	TrendingUp,
	Users,
} from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/original-songs_/$id")({
	component: OriginalSongDetailPage,
});

// 公式曲データ型（スキーマ準拠）
interface OfficialSong {
	id: string;
	officialWorkId: string;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	sourceSongId: string | null;
	notes: string | null;
}

// 親作品データ型
interface ParentWork {
	id: string;
	nameJa: string;
	shortNameJa: string | null;
}

// 外部リンクデータ型
interface OfficialSongLink {
	id: string;
	officialSongId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
}

// アレンジトラックデータ型
interface ArrangeTrack {
	trackId: string;
	trackName: string;
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
	};
	circles: Array<{
		id: string;
		name: string;
	}>;
	artists: Array<{
		id: string;
		creditName: string;
		roles: string[];
	}>;
}

// モックデータ - 曲
const mockOfficialSongs: Record<string, OfficialSong> = {
	"th06-15": {
		id: "th06-15",
		officialWorkId: "th06",
		trackNumber: 15,
		name: "U.N.オーエンは彼女なのか？",
		nameJa: "U.N.オーエンは彼女なのか？",
		nameEn: "U.N. Owen Was Her?",
		composerName: "ZUN",
		arrangerName: null,
		isOriginal: true,
		sourceSongId: null,
		notes: "6面ボス フランドール・スカーレットのテーマ",
	},
	"th06-13": {
		id: "th06-13",
		officialWorkId: "th06",
		trackNumber: 13,
		name: "亡き王女の為のセプテット",
		nameJa: "亡き王女の為のセプテット",
		nameEn: "Septette for the Dead Princess",
		composerName: "ZUN",
		arrangerName: null,
		isOriginal: true,
		sourceSongId: null,
		notes: "5面ボス レミリア・スカーレットのテーマ",
	},
	"th06-09": {
		id: "th06-09",
		officialWorkId: "th06",
		trackNumber: 9,
		name: "ラクトガール 〜 少女密室",
		nameJa: "ラクトガール",
		nameEn: "Locked Girl ~ The Girl's Secret Room",
		composerName: "ZUN",
		arrangerName: null,
		isOriginal: true,
		sourceSongId: null,
		notes: "4面ボス パチュリー・ノーレッジのテーマ",
	},
};

// モックデータ - 親作品
const mockParentWorks: Record<string, ParentWork> = {
	th06: {
		id: "th06",
		nameJa: "東方紅魔郷",
		shortNameJa: "紅魔郷",
	},
};

// モックデータ - 外部リンク
const mockSongLinks: Record<string, OfficialSongLink[]> = {
	"th06-15": [
		{
			id: "sl-1",
			officialSongId: "th06-15",
			platformCode: "youtube",
			url: "https://www.youtube.com/results?search_query=U.N.%E3%82%AA%E3%83%BC%E3%82%A8%E3%83%B3%E3%81%AF%E5%BD%BC%E5%A5%B3%E3%81%AA%E3%81%AE%E3%81%8B",
			sortOrder: 1,
		},
		{
			id: "sl-2",
			officialSongId: "th06-15",
			platformCode: "thwiki",
			url: "https://thwiki.cc/U.N.%E3%82%AA%E3%83%BC%E3%82%A8%E3%83%B3%E3%81%AF%E5%BD%BC%E5%A5%B3%E3%81%AA%E3%81%AE%E3%81%8B%EF%BC%9F",
			sortOrder: 2,
		},
	],
};

// モックデータ - アレンジ
const mockArranges: Record<string, ArrangeTrack[]> = {
	"th06-15": [
		{
			trackId: "track-1",
			trackName: "最終鬼畜妹フランドール・S",
			release: {
				id: "rel-1",
				name: "東方乙女囃子",
				releaseDate: "2006-12-31",
			},
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			artists: [
				{ id: "artist-arm", creditName: "ARM", roles: ["arrange", "lyrics"] },
				{ id: "artist-miko", creditName: "miko", roles: ["vocal"] },
			],
		},
		{
			trackId: "track-2",
			trackName: "U.N.オーエンは彼女なのか？ Remix",
			release: {
				id: "rel-2",
				name: "Scarlet Destiny",
				releaseDate: "2008-08-16",
			},
			circles: [{ id: "circle-alst", name: "Alstroemeria Records" }],
			artists: [
				{
					id: "artist-masayoshi",
					creditName: "Masayoshi Minoshima",
					roles: ["arrange"],
				},
				{ id: "artist-nomico", creditName: "nomico", roles: ["vocal"] },
			],
		},
		{
			trackId: "track-3",
			trackName: "きゅっとして☆フランドール",
			release: {
				id: "rel-3",
				name: "東方萃翠酒酔",
				releaseDate: "2007-05-20",
			},
			circles: [{ id: "circle-silver", name: "Silver Forest" }],
			artists: [
				{ id: "artist-nyu", creditName: "NYO", roles: ["arrange"] },
				{ id: "artist-aki", creditName: "Aki", roles: ["vocal"] },
			],
		},
		{
			trackId: "track-4",
			trackName: "U.N. Owen was her? (eurobeat remix)",
			release: {
				id: "rel-4",
				name: "Toho Eurobeat Vol.1",
				releaseDate: "2009-12-30",
			},
			circles: [{ id: "circle-aands", name: "A-One" }],
			artists: [
				{ id: "artist-ysk", creditName: "ELEMENTAS", roles: ["arrange"] },
			],
		},
		{
			trackId: "track-5",
			trackName: "フランドール・S",
			release: {
				id: "rel-5",
				name: "東方紅魔狂 〜 Scarlet Arrows",
				releaseDate: "2010-03-14",
			},
			circles: [{ id: "circle-cool", name: "COOL&CREATE" }],
			artists: [
				{
					id: "artist-beatmario",
					creditName: "ビートまりお",
					roles: ["arrange", "vocal"],
				},
			],
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

	// モックデータから取得
	const song = mockOfficialSongs[id];
	const parentWork = song ? mockParentWorks[song.officialWorkId] : null;
	const links = mockSongLinks[id] || [];
	const arranges = mockArranges[id] || [];

	// 曲が見つからない場合
	if (!song || !parentWork) {
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
					{ label: song.nameJa },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="badge badge-outline badge-lg">
								Track {song.trackNumber?.toString().padStart(2, "0")}
							</span>
							<h1 className="font-bold text-2xl sm:text-3xl">{song.nameJa}</h1>
						</div>
						{song.nameEn && (
							<p className="text-base-content/70">{song.nameEn}</p>
						)}
						<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
							<Link
								to="/official-works/$id"
								params={{ id: parentWork.id }}
								className="flex items-center gap-1 hover:text-primary"
							>
								<Disc3 className="size-4" />
								{parentWork.nameJa}
							</Link>
							{song.composerName && (
								<span className="flex items-center gap-1">
									<Music className="size-4" />
									作曲: {song.composerName}
								</span>
							)}
						</div>
						{song.notes && (
							<p className="text-base-content/60 text-sm">{song.notes}</p>
						)}
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
				<div className="mt-6">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<TrendingUp className="size-5" />
							<span className="font-bold text-2xl">
								{arranges.length.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アレンジ数</p>
					</div>
				</div>
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
