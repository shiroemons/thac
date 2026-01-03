import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpen,
	Disc3,
	ExternalLink,
	Gamepad2,
	Music,
	TrendingUp,
} from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/official-works_/$id")({
	component: OfficialWorkDetailPage,
});

// カテゴリ型
type WorkCategory = "game" | "music" | "book";

// 公式作品データ型（スキーマ準拠）
interface OfficialWork {
	id: string;
	categoryCode: WorkCategory;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	numberInSeries: number | null;
	releaseDate: string | null;
	officialOrganization: string | null;
	position: number | null;
	notes: string | null;
}

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
	arrangeCount: number; // trackOfficialSongsから集計
}

// 外部リンクデータ型（スキーマ準拠）
interface OfficialWorkLink {
	id: string;
	officialWorkId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
}

// モックデータ
const mockOfficialWorks: Record<string, OfficialWork> = {
	th06: {
		id: "th06",
		categoryCode: "game",
		name: "東方紅魔郷 〜 the Embodiment of Scarlet Devil.",
		nameJa: "東方紅魔郷",
		nameEn: "Embodiment of Scarlet Devil",
		shortNameJa: "紅魔郷",
		shortNameEn: "EoSD",
		numberInSeries: 6,
		releaseDate: "2002-08-11",
		officialOrganization: "上海アリス幻樂団",
		position: 1,
		notes: null,
	},
	th07: {
		id: "th07",
		categoryCode: "game",
		name: "東方妖々夢 〜 Perfect Cherry Blossom.",
		nameJa: "東方妖々夢",
		nameEn: "Perfect Cherry Blossom",
		shortNameJa: "妖々夢",
		shortNameEn: "PCB",
		numberInSeries: 7,
		releaseDate: "2003-08-17",
		officialOrganization: "上海アリス幻樂団",
		position: 2,
		notes: null,
	},
	th08: {
		id: "th08",
		categoryCode: "game",
		name: "東方永夜抄 〜 Imperishable Night.",
		nameJa: "東方永夜抄",
		nameEn: "Imperishable Night",
		shortNameJa: "永夜抄",
		shortNameEn: "IN",
		numberInSeries: 8,
		releaseDate: "2004-08-15",
		officialOrganization: "上海アリス幻樂団",
		position: 3,
		notes: null,
	},
};

const mockOfficialSongs: Record<string, OfficialSong[]> = {
	th06: [
		{
			id: "th06-01",
			officialWorkId: "th06",
			trackNumber: 1,
			name: "赤より紅い夢",
			nameJa: "赤より紅い夢",
			nameEn: "A Dream More Crimson than Red",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 89,
		},
		{
			id: "th06-02",
			officialWorkId: "th06",
			trackNumber: 2,
			name: "ほおずきみたいに紅い魂",
			nameJa: "ほおずきみたいに紅い魂",
			nameEn: "A Soul as Red as a Ground Cherry",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 156,
		},
		{
			id: "th06-03",
			officialWorkId: "th06",
			trackNumber: 3,
			name: "妖魔夜行",
			nameJa: "妖魔夜行",
			nameEn: "Apparitions Stalk the Night",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 234,
		},
		{
			id: "th06-04",
			officialWorkId: "th06",
			trackNumber: 4,
			name: "ルーネイトエルフ",
			nameJa: "ルーネイトエルフ",
			nameEn: "Lunate Elf",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 178,
		},
		{
			id: "th06-05",
			officialWorkId: "th06",
			trackNumber: 5,
			name: "おてんば恋娘",
			nameJa: "おてんば恋娘",
			nameEn: "Beloved Tomboyish Girl",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 567,
		},
		{
			id: "th06-06",
			officialWorkId: "th06",
			trackNumber: 6,
			name: "上海紅茶館 〜 Chinese Tea",
			nameJa: "上海紅茶館",
			nameEn: "Shanghai Teahouse ~ Chinese Tea",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 445,
		},
		{
			id: "th06-07",
			officialWorkId: "th06",
			trackNumber: 7,
			name: "明治十七年の上海アリス",
			nameJa: "明治十七年の上海アリス",
			nameEn: "Shanghai Alice of Meiji 17",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 312,
		},
		{
			id: "th06-08",
			officialWorkId: "th06",
			trackNumber: 8,
			name: "ヴワル魔法図書館",
			nameJa: "ヴワル魔法図書館",
			nameEn: "Voile, the Magic Library",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 289,
		},
		{
			id: "th06-09",
			officialWorkId: "th06",
			trackNumber: 9,
			name: "ラクトガール 〜 少女密室",
			nameJa: "ラクトガール",
			nameEn: "Locked Girl ~ The Girl's Secret Room",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 678,
		},
		{
			id: "th06-10",
			officialWorkId: "th06",
			trackNumber: 10,
			name: "メイドと血の懐中時計",
			nameJa: "メイドと血の懐中時計",
			nameEn: "The Maid and the Pocket Watch of Blood",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 234,
		},
		{
			id: "th06-11",
			officialWorkId: "th06",
			trackNumber: 11,
			name: "月時計 〜 ルナ・ダイアル",
			nameJa: "月時計",
			nameEn: "Lunar Clock ~ Luna Dial",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 567,
		},
		{
			id: "th06-12",
			officialWorkId: "th06",
			trackNumber: 12,
			name: "ツェペシュの幼き末裔",
			nameJa: "ツェペシュの幼き末裔",
			nameEn: "The Young Descendant of Tepes",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 345,
		},
		{
			id: "th06-13",
			officialWorkId: "th06",
			trackNumber: 13,
			name: "亡き王女の為のセプテット",
			nameJa: "亡き王女の為のセプテット",
			nameEn: "Septette for the Dead Princess",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 1234,
		},
		{
			id: "th06-14",
			officialWorkId: "th06",
			trackNumber: 14,
			name: "魔法少女達の百年祭",
			nameJa: "魔法少女達の百年祭",
			nameEn: "The Centennial Festival for Magical Girls",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 198,
		},
		{
			id: "th06-15",
			officialWorkId: "th06",
			trackNumber: 15,
			name: "U.N.オーエンは彼女なのか？",
			nameJa: "U.N.オーエンは彼女なのか？",
			nameEn: "U.N. Owen Was Her?",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 2345,
		},
		{
			id: "th06-16",
			officialWorkId: "th06",
			trackNumber: 16,
			name: "紅より儚い永遠",
			nameJa: "紅より儚い永遠",
			nameEn: "An Eternity More Transient than Scarlet",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 123,
		},
		{
			id: "th06-17",
			officialWorkId: "th06",
			trackNumber: 17,
			name: "紅楼 〜 Eastern Dream...",
			nameJa: "紅楼",
			nameEn: "Scarlet Tower ~ Eastern Dream...",
			composerName: "ZUN",
			arrangerName: null,
			isOriginal: true,
			arrangeCount: 87,
		},
	],
};

const mockWorkLinks: Record<string, OfficialWorkLink[]> = {
	th06: [
		{
			id: "wl-th06-1",
			officialWorkId: "th06",
			platformCode: "official",
			url: "https://www16.big.or.jp/~zun/html/th06.html",
			sortOrder: 1,
		},
	],
};

// カテゴリ設定
const categoryConfig: Record<
	WorkCategory,
	{ label: string; icon: React.ReactNode; badgeClass: string }
> = {
	game: {
		label: "ゲーム",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-primary",
	},
	music: {
		label: "音楽CD",
		icon: <Disc3 className="size-4" />,
		badgeClass: "badge-secondary",
	},
	book: {
		label: "書籍",
		icon: <BookOpen className="size-4" />,
		badgeClass: "badge-accent",
	},
};

// プラットフォーム名
const platformNames: Record<string, string> = {
	official: "公式サイト",
	wikipedia: "Wikipedia",
	thwiki: "東方Wiki",
};

function OfficialWorkDetailPage() {
	const { id } = Route.useParams();

	// モックデータから取得
	const work = mockOfficialWorks[id];
	const songs = mockOfficialSongs[id] || [];
	const links = mockWorkLinks[id] || [];

	// 統計計算
	const stats = {
		songCount: songs.length,
		arrangeCount: songs.reduce((sum, song) => sum + song.arrangeCount, 0),
	};

	// 作品が見つからない場合
	if (!work) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[
						{ label: "公式作品", href: "/official-works" },
						{ label: id },
					]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">作品が見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDの作品は存在しません
					</p>
					<Link to="/official-works" className="btn btn-primary mt-4">
						作品一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const category = categoryConfig[work.categoryCode];

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "公式作品", href: "/official-works" },
					{ label: work.nameJa },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="font-bold text-2xl sm:text-3xl">{work.nameJa}</h1>
							<span className={`badge gap-1 ${category.badgeClass}`}>
								{category.icon}
								{category.label}
							</span>
						</div>
						{work.nameEn && (
							<p className="text-base-content/70">{work.nameEn}</p>
						)}
						<div className="flex flex-wrap gap-4 text-base-content/60 text-sm">
							{work.releaseDate && (
								<span>
									発売日:{" "}
									{new Date(work.releaseDate).toLocaleDateString("ja-JP")}
								</span>
							)}
							{work.officialOrganization && (
								<span>制作: {work.officialOrganization}</span>
							)}
							{work.numberInSeries && (
								<span>シリーズ第{work.numberInSeries}作</span>
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
				<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">{stats.songCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">収録曲</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<TrendingUp className="size-5" />
							<span className="font-bold text-2xl">
								{stats.arrangeCount.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アレンジ総数</p>
					</div>
				</div>
			</div>

			{/* 収録曲一覧 */}
			<div className="space-y-4">
				<h2 className="font-bold text-xl">収録曲</h2>
				<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
					<table className="table">
						<thead>
							<tr>
								<th className="w-16">No.</th>
								<th>曲名</th>
								<th className="hidden sm:table-cell">作曲</th>
								<th className="w-32 text-right">アレンジ数</th>
							</tr>
						</thead>
						<tbody>
							{songs
								.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
								.map((song) => (
									<tr key={song.id} className="hover:bg-base-200/50">
										<td className="text-base-content/50">
											{song.trackNumber?.toString().padStart(2, "0") || "-"}
										</td>
										<td>
											<Link
												to="/original-songs/$id"
												params={{ id: song.id }}
												className="hover:text-primary"
											>
												<div className="font-medium">{song.nameJa}</div>
												{song.nameEn && (
													<div className="text-base-content/60 text-sm">
														{song.nameEn}
													</div>
												)}
											</Link>
										</td>
										<td className="hidden text-base-content/70 sm:table-cell">
											{song.composerName || "-"}
										</td>
										<td className="text-right">
											<span className="font-medium text-primary">
												{song.arrangeCount.toLocaleString()}
											</span>
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
