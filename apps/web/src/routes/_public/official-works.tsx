import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Disc3, Gamepad2, Music } from "lucide-react";
import { useState } from "react";
import {
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";

export const Route = createFileRoute("/_public/official-works")({
	component: OfficialWorksPage,
});

// 公式作品のカテゴリ
type WorkCategory = "all" | "game" | "music" | "book";

interface OfficialWork {
	id: string;
	title: string;
	titleJp: string;
	category: Exclude<WorkCategory, "all">;
	releaseDate: string;
	songCount: number;
}

// モックデータ
const mockOfficialWorks: OfficialWork[] = [
	// ゲーム作品
	{
		id: "th06",
		title: "Embodiment of Scarlet Devil",
		titleJp: "東方紅魔郷",
		category: "game",
		releaseDate: "2002-08-11",
		songCount: 17,
	},
	{
		id: "th07",
		title: "Perfect Cherry Blossom",
		titleJp: "東方妖々夢",
		category: "game",
		releaseDate: "2003-08-17",
		songCount: 19,
	},
	{
		id: "th08",
		title: "Imperishable Night",
		titleJp: "東方永夜抄",
		category: "game",
		releaseDate: "2004-08-15",
		songCount: 21,
	},
	{
		id: "th10",
		title: "Mountain of Faith",
		titleJp: "東方風神録",
		category: "game",
		releaseDate: "2007-08-17",
		songCount: 18,
	},
	{
		id: "th11",
		title: "Subterranean Animism",
		titleJp: "東方地霊殿",
		category: "game",
		releaseDate: "2008-08-16",
		songCount: 17,
	},
	{
		id: "th17",
		title: "Wily Beast and Weakest Creature",
		titleJp: "東方鬼形獣",
		category: "game",
		releaseDate: "2019-08-12",
		songCount: 18,
	},
	{
		id: "th18",
		title: "Unconnected Marketeers",
		titleJp: "東方虹龍洞",
		category: "game",
		releaseDate: "2021-05-04",
		songCount: 17,
	},
	{
		id: "th19",
		title: "Unfinished Dream of All Living Ghost",
		titleJp: "東方獣王園",
		category: "game",
		releaseDate: "2023-08-13",
		songCount: 18,
	},
	// 音楽CD
	{
		id: "akyuu",
		title: "Akyu's Untouched Score vol.1",
		titleJp: "幺樂団の歴史1",
		category: "music",
		releaseDate: "2006-12-31",
		songCount: 11,
	},
	{
		id: "dolls_in_pseudo",
		title: "Dolls in Pseudo Paradise",
		titleJp: "蓬莱人形",
		category: "music",
		releaseDate: "2002-08-11",
		songCount: 13,
	},
	{
		id: "changeability",
		title: "Changeability of Strange Dream",
		titleJp: "夢違科学世紀",
		category: "music",
		releaseDate: "2004-12-30",
		songCount: 10,
	},
	// 書籍
	{
		id: "pmiss",
		title: "Perfect Memento in Strict Sense",
		titleJp: "東方求聞史紀",
		category: "book",
		releaseDate: "2006-12-27",
		songCount: 0,
	},
	{
		id: "symposium",
		title: "Symposium of Post-mysticism",
		titleJp: "東方求聞口授",
		category: "book",
		releaseDate: "2012-04-27",
		songCount: 0,
	},
];

const categoryConfig: Record<
	WorkCategory,
	{ label: string; icon: React.ReactNode }
> = {
	all: { label: "すべて", icon: null },
	game: { label: "ゲーム", icon: <Gamepad2 className="size-4" /> },
	music: { label: "音楽CD", icon: <Disc3 className="size-4" /> },
	book: { label: "書籍", icon: <BookOpen className="size-4" /> },
};

const categoryBadgeClass: Record<Exclude<WorkCategory, "all">, string> = {
	game: "badge-primary",
	music: "badge-secondary",
	book: "badge-accent",
};

function OfficialWorksPage() {
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [category, setCategory] = useState<WorkCategory>("all");

	const filteredWorks =
		category === "all"
			? mockOfficialWorks
			: mockOfficialWorks.filter((work) => work.category === category);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "公式作品" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">公式作品一覧</h1>
					<p className="mt-1 text-base-content/70">
						東方Project公式作品 · {filteredWorks.length}件
					</p>
				</div>
				<ViewToggle value={viewMode} onChange={setViewMode} />
			</div>

			{/* カテゴリフィルター */}
			<div className="flex flex-wrap gap-2">
				{(Object.keys(categoryConfig) as WorkCategory[]).map((cat) => (
					<button
						key={cat}
						type="button"
						className={`btn btn-sm gap-2 ${category === cat ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setCategory(cat)}
						aria-pressed={category === cat}
					>
						{categoryConfig[cat].icon}
						{categoryConfig[cat].label}
					</button>
				))}
			</div>

			{/* 作品一覧 */}
			{viewMode === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredWorks.map((work) => (
						<Link
							key={work.id}
							to="/official-works/$id"
							params={{ id: work.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<div className="flex items-start justify-between gap-2">
									<h3 className="card-title text-base">{work.titleJp}</h3>
									<span
										className={`badge badge-sm ${categoryBadgeClass[work.category]}`}
									>
										{categoryConfig[work.category].label}
									</span>
								</div>
								<p className="text-base-content/70 text-sm">{work.title}</p>
								<div className="mt-2 flex items-center gap-4 text-base-content/50 text-sm">
									<span>{work.releaseDate.split("-")[0]}年</span>
									{work.songCount > 0 && (
										<span className="flex items-center gap-1">
											<Music className="size-3" aria-hidden="true" />
											{work.songCount}曲
										</span>
									)}
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
								<th>タイトル</th>
								<th>カテゴリ</th>
								<th>発売年</th>
								<th>曲数</th>
							</tr>
						</thead>
						<tbody>
							{filteredWorks.map((work) => (
								<tr key={work.id} className="hover:bg-base-200/50">
									<td>
										<Link
											to="/official-works/$id"
											params={{ id: work.id }}
											className="hover:text-primary"
										>
											<div className="font-medium">{work.titleJp}</div>
											<div className="text-base-content/70 text-sm">
												{work.title}
											</div>
										</Link>
									</td>
									<td>
										<span
											className={`badge badge-sm ${categoryBadgeClass[work.category]}`}
										>
											{categoryConfig[work.category].label}
										</span>
									</td>
									<td className="text-base-content/70">
										{work.releaseDate.split("-")[0]}年
									</td>
									<td className="text-base-content/70">
										{work.songCount > 0 ? `${work.songCount}曲` : "-"}
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
