import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Music } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	EmptyState,
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";

export const Route = createFileRoute("/_public/original-songs")({
	component: OriginalSongsPage,
});

const STORAGE_KEY_VIEW = "original-songs-view-mode";

interface OriginalSong {
	id: string;
	title: string;
	titleRomaji?: string;
	workId: string;
	workTitle: string;
	trackNumber: number;
	arrangeCount: number;
}

interface Work {
	id: string;
	title: string;
}

// モックデータ: 公式作品
const mockWorks: Work[] = [
	{ id: "all", title: "すべて" },
	{ id: "th06", title: "東方紅魔郷" },
	{ id: "th07", title: "東方妖々夢" },
	{ id: "th08", title: "東方永夜抄" },
	{ id: "th10", title: "東方風神録" },
	{ id: "th11", title: "東方地霊殿" },
	{ id: "th17", title: "東方鬼形獣" },
	{ id: "th18", title: "東方虹龍洞" },
	{ id: "th19", title: "東方獣王園" },
];

// モックデータ: 原曲
const mockOriginalSongs: OriginalSong[] = [
	// 東方紅魔郷
	{
		id: "th06-01",
		title: "赤より紅い夢",
		titleRomaji: "Aka yori Akai Yume",
		workId: "th06",
		workTitle: "東方紅魔郷",
		trackNumber: 1,
		arrangeCount: 234,
	},
	{
		id: "th06-02",
		title: "ほおずきみたいに紅い魂",
		titleRomaji: "Hoozuki mitai ni Akai Tamashii",
		workId: "th06",
		workTitle: "東方紅魔郷",
		trackNumber: 2,
		arrangeCount: 567,
	},
	{
		id: "th06-03",
		title: "妖魔夜行",
		titleRomaji: "Youma Yakou",
		workId: "th06",
		workTitle: "東方紅魔郷",
		trackNumber: 3,
		arrangeCount: 189,
	},
	{
		id: "th06-09",
		title: "亡き王女の為のセプテット",
		titleRomaji: "Naki Oujo no tame no Septette",
		workId: "th06",
		workTitle: "東方紅魔郷",
		trackNumber: 9,
		arrangeCount: 2345,
	},
	{
		id: "th06-10",
		title: "U.N.オーエンは彼女なのか？",
		titleRomaji: "U.N. Owen wa Kanojo nanoka?",
		workId: "th06",
		workTitle: "東方紅魔郷",
		trackNumber: 10,
		arrangeCount: 3456,
	},
	// 東方妖々夢
	{
		id: "th07-01",
		title: "妖々夢　～ Snow or Cherry Petal",
		titleRomaji: "Youyoumu ~ Snow or Cherry Petal",
		workId: "th07",
		workTitle: "東方妖々夢",
		trackNumber: 1,
		arrangeCount: 123,
	},
	{
		id: "th07-13",
		title: "幽雅に咲かせ、墨染の桜",
		titleRomaji: "Yuuga ni Sakase, Sumizome no Sakura",
		workId: "th07",
		workTitle: "東方妖々夢",
		trackNumber: 13,
		arrangeCount: 1876,
	},
	{
		id: "th07-14",
		title: "ボーダーオブライフ",
		titleRomaji: "Border of Life",
		workId: "th07",
		workTitle: "東方妖々夢",
		trackNumber: 14,
		arrangeCount: 987,
	},
	// 東方永夜抄
	{
		id: "th08-16",
		title: "竹取飛翔　～ Lunatic Princess",
		titleRomaji: "Taketori Hishou ~ Lunatic Princess",
		workId: "th08",
		workTitle: "東方永夜抄",
		trackNumber: 16,
		arrangeCount: 1654,
	},
	{
		id: "th08-17",
		title: "ヴォヤージュ1969",
		titleRomaji: "Voyage 1969",
		workId: "th08",
		workTitle: "東方永夜抄",
		trackNumber: 17,
		arrangeCount: 432,
	},
	// 東方風神録
	{
		id: "th10-08",
		title: "信仰は儚き人間の為に",
		titleRomaji: "Shunkou wa Hakanaki Ningen no Tame ni",
		workId: "th10",
		workTitle: "東方風神録",
		trackNumber: 8,
		arrangeCount: 1234,
	},
	{
		id: "th10-11",
		title: "少女が見た日本の原風景",
		titleRomaji: "Shoujo ga Mita Nihon no Genfuukei",
		workId: "th10",
		workTitle: "東方風神録",
		trackNumber: 11,
		arrangeCount: 567,
	},
	// 東方地霊殿
	{
		id: "th11-06",
		title: "ハルトマンの妖怪少女",
		titleRomaji: "Hartmann no Youkai Shoujo",
		workId: "th11",
		workTitle: "東方地霊殿",
		trackNumber: 6,
		arrangeCount: 1876,
	},
	{
		id: "th11-14",
		title: "霊知の太陽信仰　～ Nuclear Fusion",
		titleRomaji: "Reichi no Taiyou Shinkou ~ Nuclear Fusion",
		workId: "th11",
		workTitle: "東方地霊殿",
		trackNumber: 14,
		arrangeCount: 2134,
	},
];

function OriginalSongsPage() {
	const [viewMode, setViewModeState] = useState<ViewMode>("list");
	const [selectedWork, setSelectedWork] = useState("all");

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode;
		if (saved) setViewModeState(saved);
	}, []);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	const filteredSongs = useMemo(() => {
		if (selectedWork === "all") {
			return mockOriginalSongs;
		}
		return mockOriginalSongs.filter((song) => song.workId === selectedWork);
	}, [selectedWork]);

	// アレンジ数でソート（降順）
	const sortedSongs = useMemo(() => {
		return [...filteredSongs].sort((a, b) => b.arrangeCount - a.arrangeCount);
	}, [filteredSongs]);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "原曲" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">原曲一覧</h1>
					<p className="mt-1 text-base-content/70">
						東方Project原曲 · {sortedSongs.length}曲
					</p>
				</div>
				<ViewToggle value={viewMode} onChange={setViewMode} />
			</div>

			{/* 作品フィルター */}
			<div className="flex flex-wrap gap-2">
				{mockWorks.map((work) => (
					<button
						key={work.id}
						type="button"
						className={`btn btn-sm ${selectedWork === work.id ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setSelectedWork(work.id)}
						aria-pressed={selectedWork === work.id}
					>
						{work.title}
					</button>
				))}
			</div>

			{/* 公式作品一覧へのリンク */}
			<div className="rounded-box bg-base-200 p-4">
				<Link
					to="/official-works"
					className="group flex items-center gap-2 hover:text-primary"
				>
					<Music className="size-5" aria-hidden="true" />
					<span>公式作品の詳細一覧を見る</span>
					<ChevronRight
						className="size-4 transition-transform group-hover:translate-x-1"
						aria-hidden="true"
					/>
				</Link>
			</div>

			{/* 原曲一覧 */}
			{sortedSongs.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当する原曲がありません"
					description="別の作品を選択してお試しください"
				/>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{sortedSongs.map((song) => (
						<Link
							key={song.id}
							to="/original-songs/$id"
							params={{ id: song.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<h3 className="card-title text-base">{song.title}</h3>
								{song.titleRomaji && (
									<p className="text-base-content/50 text-xs">
										{song.titleRomaji}
									</p>
								)}
								<div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
									<span className="badge badge-ghost badge-sm">
										{song.workTitle}
									</span>
									<span className="text-base-content/50">
										Track {song.trackNumber}
									</span>
								</div>
								<div className="mt-2 flex items-center gap-1 text-primary">
									<Music className="size-4" aria-hidden="true" />
									<span className="font-medium">
										{song.arrangeCount.toLocaleString()} アレンジ
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="table">
						<thead>
							<tr>
								<th>曲名</th>
								<th>作品</th>
								<th>Track</th>
								<th>アレンジ数</th>
							</tr>
						</thead>
						<tbody>
							{sortedSongs.map((song) => (
								<tr key={song.id} className="hover:bg-base-200/50">
									<td>
										<Link
											to="/original-songs/$id"
											params={{ id: song.id }}
											className="hover:text-primary"
										>
											<div className="font-medium">{song.title}</div>
											{song.titleRomaji && (
												<div className="text-base-content/50 text-xs">
													{song.titleRomaji}
												</div>
											)}
										</Link>
									</td>
									<td>
										<span className="badge badge-ghost badge-sm">
											{song.workTitle}
										</span>
									</td>
									<td className="text-base-content/70">{song.trackNumber}</td>
									<td className="text-primary">
										{song.arrangeCount.toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
