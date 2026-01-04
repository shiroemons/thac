import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BarChart3,
	Calendar,
	Crown,
	Disc3,
	type LucideIcon,
	Music,
	PenLine,
	Sparkles,
	TrendingUp,
	Trophy,
	Users,
} from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/_public/stats")({
	head: () => createPageHead("統計"),
	component: StatsPage,
});

// モック統計データ
const mockStats = {
	originalSongs: 1234,
	circles: 456,
	artists: 890,
	events: 567,
	tracks: 12345,
};

// 人気原曲ランキング
const popularSongsRanking = [
	{ id: "un-owen", name: "U.N.オーエンは彼女なのか？", count: 1234 },
	{ id: "night-of-nights", name: "ナイト・オブ・ナイツ", count: 1123 },
	{ id: "septette", name: "亡き王女の為のセプテット", count: 987 },
	{ id: "bad-apple", name: "Bad Apple!! feat. nomico", count: 876 },
	{ id: "kamisama", name: "神々が恋した幻想郷", count: 765 },
];

// アクティブサークルランキング
const activeCirclesRanking = [
	{ id: "iosys", name: "IOSYS", count: 156 },
	{ id: "sound-holic", name: "SOUND HOLIC", count: 134 },
	{ id: "cool-and-create", name: "COOL&CREATE", count: 112 },
	{ id: "tamusic", name: "TAMusic", count: 98 },
	{ id: "alstroemeria", name: "Alstroemeria Records", count: 89 },
];

// アクティブアーティストランキング
const activeArtistsRanking = [
	{ id: "zun", name: "ZUN", count: 789 },
	{ id: "kouki", name: "幽閉サテライト", count: 567 },
	{ id: "masayoshi", name: "Masayoshi Minoshima", count: 567 },
	{ id: "tamaonsen", name: "魂音泉", count: 523 },
	{ id: "arm", name: "ARM", count: 456 },
];

// 最近の更新
const recentUpdates = [
	{
		id: "release-1",
		title: "幻想郷アレンジコレクション Vol.15",
		circleName: "IOSYS",
		date: "2026-01-02",
		type: "new" as const,
	},
	{
		id: "release-2",
		title: "東方ボーカルBEST 2025",
		circleName: "Alstroemeria Records",
		date: "2026-01-01",
		type: "new" as const,
	},
	{
		id: "release-3",
		title: "紅楼夢リミックス",
		circleName: "SOUND HOLIC",
		date: "2025-12-31",
		type: "update" as const,
	},
	{
		id: "release-4",
		title: "ナイト・オブ・ナイツ 10th Anniversary",
		circleName: "COOL&CREATE",
		date: "2025-12-30",
		type: "new" as const,
	},
	{
		id: "release-5",
		title: "東方ピアノコレクション",
		circleName: "TAMusic",
		date: "2025-12-29",
		type: "update" as const,
	},
];

interface StatCardProps {
	icon: LucideIcon;
	count: number;
	label: string;
	href?: string;
	trend?: number;
	color?: string;
}

function StatCard({
	icon: Icon,
	count,
	label,
	href,
	trend,
	color = "text-primary",
}: StatCardProps) {
	const bgColor = color.replace("text-", "bg-").concat("/10");

	const content = (
		<div className="glass-card group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
			<div className="flex items-center justify-between">
				<div
					className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgColor} ${color} transition-transform duration-300 group-hover:scale-110`}
				>
					<Icon className="h-5 w-5" aria-hidden="true" />
				</div>
				{trend !== undefined && (
					<div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-success text-xs">
						<TrendingUp className="h-3 w-3" aria-hidden="true" />
						<span>+{trend}%</span>
					</div>
				)}
			</div>
			<div>
				<div className="font-bold text-2xl tracking-tight md:text-3xl">
					{formatNumber(count)}
				</div>
				<div className="mt-1 text-base-content/60 text-sm">{label}</div>
			</div>
		</div>
	);

	if (href) {
		return (
			<Link to={href} className="block">
				{content}
			</Link>
		);
	}

	return content;
}

interface RankingItemProps {
	rank: number;
	name: string;
	count: number;
	unit: string;
	href: string;
}

function RankingItem({ rank, name, count, unit, href }: RankingItemProps) {
	const getRankStyle = (r: number) => {
		switch (r) {
			case 1:
				return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md";
			case 2:
				return "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-sm";
			case 3:
				return "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm";
			default:
				return "bg-base-content/10 text-base-content/70";
		}
	};

	return (
		<Link
			to={href}
			className="group flex items-center gap-3 rounded-xl p-3 transition-all duration-300 hover:bg-base-content/5"
		>
			<span
				className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm ${getRankStyle(rank)}`}
			>
				{rank}
			</span>
			<span className="min-w-0 flex-1 truncate font-medium transition-colors group-hover:text-primary">
				{name}
			</span>
			<span className="whitespace-nowrap rounded-full bg-base-content/5 px-2.5 py-1 text-base-content/60 text-xs">
				{formatNumber(count)} {unit}
			</span>
		</Link>
	);
}

function StatsPage() {
	return (
		<div className="space-y-8">
			<PublicBreadcrumb items={[{ label: "統計" }]} />

			{/* Hero header */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<BarChart3 className="h-7 w-7" aria-hidden="true" />
					</div>
					<div>
						<h1 className="font-bold text-2xl md:text-3xl">
							統計ダッシュボード
						</h1>
						<p className="mt-1 text-base-content/60">
							東方編曲録のデータベース統計
						</p>
					</div>
				</div>
			</div>

			{/* Stats cards */}
			<section>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<StatCard
						icon={Music}
						count={mockStats.originalSongs}
						label="原曲"
						href="/original-songs"
						color="text-secondary"
					/>
					<StatCard
						icon={Disc3}
						count={mockStats.circles}
						label="サークル"
						href="/circles"
						color="text-primary"
					/>
					<StatCard
						icon={Users}
						count={mockStats.artists}
						label="アーティスト"
						href="/artists"
						color="text-accent"
					/>
					<StatCard
						icon={Calendar}
						count={mockStats.events}
						label="イベント"
						href="/events"
						color="text-info"
					/>
					<StatCard
						icon={Music}
						count={mockStats.tracks}
						label="トラック"
						trend={12}
						color="text-success"
					/>
				</div>
			</section>

			{/* Ranking sections */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Popular songs ranking */}
				<section className="glass-card overflow-hidden rounded-2xl">
					<div className="flex items-center justify-between border-base-content/10 border-b p-5">
						<div className="flex items-center gap-2">
							<Trophy className="h-5 w-5 text-yellow-500" aria-hidden="true" />
							<h2 className="font-bold">人気原曲</h2>
						</div>
						<Link
							to="/original-songs"
							className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary/80"
						>
							すべて見る
							<span className="transition-transform group-hover:translate-x-0.5">
								→
							</span>
						</Link>
					</div>
					<div className="divide-y divide-base-content/5 px-2 py-1">
						{popularSongsRanking.map((song, index) => (
							<RankingItem
								key={song.id}
								rank={index + 1}
								name={song.name}
								count={song.count}
								unit="アレンジ"
								href={`/original-songs/${song.id}`}
							/>
						))}
					</div>
				</section>

				{/* Active circles ranking */}
				<section className="glass-card overflow-hidden rounded-2xl">
					<div className="flex items-center justify-between border-base-content/10 border-b p-5">
						<div className="flex items-center gap-2">
							<Crown className="h-5 w-5 text-primary" aria-hidden="true" />
							<h2 className="font-bold">アクティブサークル</h2>
						</div>
						<Link
							to="/circles"
							className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary/80"
						>
							すべて見る
							<span className="transition-transform group-hover:translate-x-0.5">
								→
							</span>
						</Link>
					</div>
					<div className="divide-y divide-base-content/5 px-2 py-1">
						{activeCirclesRanking.map((circle, index) => (
							<RankingItem
								key={circle.id}
								rank={index + 1}
								name={circle.name}
								count={circle.count}
								unit="リリース"
								href={`/circles/${circle.id}`}
							/>
						))}
					</div>
				</section>

				{/* Active artists ranking */}
				<section className="glass-card overflow-hidden rounded-2xl">
					<div className="flex items-center justify-between border-base-content/10 border-b p-5">
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
							<h2 className="font-bold">アクティブアーティスト</h2>
						</div>
						<Link
							to="/artists"
							className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary/80"
						>
							すべて見る
							<span className="transition-transform group-hover:translate-x-0.5">
								→
							</span>
						</Link>
					</div>
					<div className="divide-y divide-base-content/5 px-2 py-1">
						{activeArtistsRanking.map((artist, index) => (
							<RankingItem
								key={artist.id}
								rank={index + 1}
								name={artist.name}
								count={artist.count}
								unit="曲"
								href={`/artists/${artist.id}`}
							/>
						))}
					</div>
				</section>
			</div>

			{/* Recent updates */}
			<section className="glass-card overflow-hidden rounded-2xl">
				<div className="flex items-center justify-between border-base-content/10 border-b p-5">
					<div className="flex items-center gap-2">
						<Calendar className="h-5 w-5 text-info" aria-hidden="true" />
						<h2 className="font-bold">最近の更新</h2>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-base-content/5 border-b text-left text-base-content/50 text-sm">
								<th className="px-5 py-3 font-medium">状態</th>
								<th className="px-5 py-3 font-medium">タイトル</th>
								<th className="px-5 py-3 font-medium">サークル</th>
								<th className="px-5 py-3 font-medium">日付</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-base-content/5">
							{recentUpdates.map((update) => (
								<tr
									key={update.id}
									className="transition-colors hover:bg-base-content/5"
								>
									<td className="px-5 py-4">
										{update.type === "new" ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary text-xs">
												<Sparkles className="h-3 w-3" aria-hidden="true" />
												NEW
											</span>
										) : (
											<span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-secondary text-xs">
												<PenLine className="h-3 w-3" aria-hidden="true" />
												更新
											</span>
										)}
									</td>
									<td className="px-5 py-4 font-medium">{update.title}</td>
									<td className="px-5 py-4 text-base-content/60">
										{update.circleName}
									</td>
									<td className="px-5 py-4 text-base-content/60">
										{update.date}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
