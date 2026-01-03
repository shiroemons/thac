import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	ChevronRight,
	Disc,
	Music,
	PenLine,
	Users,
} from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/stats")({
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

// 人気原曲ランキング（アレンジ数順）
const popularSongsRanking = [
	{ id: "un-owen", name: "U.N.オーエンは彼女なのか？", count: 1234 },
	{ id: "night-of-nights", name: "ナイト・オブ・ナイツ", count: 1123 },
	{ id: "septette", name: "亡き王女の為のセプテット", count: 987 },
	{ id: "bad-apple", name: "Bad Apple!! feat. nomico", count: 876 },
	{ id: "kamisama", name: "神々が恋した幻想郷", count: 765 },
];

// アクティブサークルランキング（リリース数順）
const activeCirclesRanking = [
	{ id: "iosys", name: "IOSYS", count: 156 },
	{ id: "sound-holic", name: "SOUND HOLIC", count: 134 },
	{ id: "cool-and-create", name: "COOL&CREATE", count: 112 },
	{ id: "tamusic", name: "TAMusic", count: 98 },
	{ id: "alstroemeria", name: "Alstroemeria Records", count: 89 },
];

// アクティブアーティストランキング（参加トラック数順）
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
	icon: React.ReactNode;
	count: number;
	label: string;
	href?: string;
}

function StatCard({ icon, count, label, href }: StatCardProps) {
	const content = (
		<div className="flex flex-col items-center gap-2 rounded-box bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md">
			<div className="text-2xl text-primary">{icon}</div>
			<div className="font-bold text-2xl">{count.toLocaleString()}</div>
			<div className="text-base-content/70 text-sm">{label}</div>
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
	return (
		<Link
			to={href}
			className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-base-200"
		>
			<span className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
				{rank}
			</span>
			<span className="min-w-0 flex-1 truncate">{name}</span>
			<span className="text-base-content/70 text-sm">
				{count.toLocaleString()}
				{unit}
			</span>
		</Link>
	);
}

function StatsPage() {
	return (
		<div className="space-y-8">
			<PublicBreadcrumb items={[{ label: "統計" }]} />

			{/* ヘッダー */}
			<div>
				<h1 className="font-bold text-3xl">統計ダッシュボード</h1>
				<p className="mt-1 text-base-content/70">
					東方編曲録のデータベース統計
				</p>
			</div>

			{/* 統計カード */}
			<section>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<StatCard
						icon={<Music className="size-8" aria-hidden="true" />}
						count={mockStats.originalSongs}
						label="原曲"
						href="/original-songs"
					/>
					<StatCard
						icon={<Users className="size-8" aria-hidden="true" />}
						count={mockStats.circles}
						label="サークル"
						href="/circles"
					/>
					<StatCard
						icon={<Users className="size-8" aria-hidden="true" />}
						count={mockStats.artists}
						label="アーティスト"
						href="/artists"
					/>
					<StatCard
						icon={<Calendar className="size-8" aria-hidden="true" />}
						count={mockStats.events}
						label="イベント"
						href="/events"
					/>
					<StatCard
						icon={<Disc className="size-8" aria-hidden="true" />}
						count={mockStats.tracks}
						label="トラック"
					/>
				</div>
			</section>

			{/* ランキングセクション */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* 人気原曲ランキング */}
				<section className="rounded-lg bg-base-100 p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-bold text-lg">人気原曲ランキング</h2>
						<Link
							to="/original-songs"
							className="flex items-center gap-1 text-primary text-sm hover:underline"
						>
							すべて見る
							<ChevronRight className="size-4" aria-hidden="true" />
						</Link>
					</div>
					<div className="space-y-1">
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

				{/* アクティブサークルランキング */}
				<section className="rounded-lg bg-base-100 p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-bold text-lg">アクティブサークル</h2>
						<Link
							to="/circles"
							className="flex items-center gap-1 text-primary text-sm hover:underline"
						>
							すべて見る
							<ChevronRight className="size-4" aria-hidden="true" />
						</Link>
					</div>
					<div className="space-y-1">
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

				{/* アクティブアーティストランキング */}
				<section className="rounded-lg bg-base-100 p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-bold text-lg">アクティブアーティスト</h2>
						<Link
							to="/artists"
							className="flex items-center gap-1 text-primary text-sm hover:underline"
						>
							すべて見る
							<ChevronRight className="size-4" aria-hidden="true" />
						</Link>
					</div>
					<div className="space-y-1">
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

			{/* 最近の更新 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-bold text-lg">最近の更新</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="table">
						<thead>
							<tr>
								<th>状態</th>
								<th>タイトル</th>
								<th>サークル</th>
								<th>日付</th>
							</tr>
						</thead>
						<tbody>
							{recentUpdates.map((update) => (
								<tr key={update.id} className="hover:bg-base-200/50">
									<td>
										{update.type === "new" ? (
											<span className="badge badge-primary badge-sm">NEW</span>
										) : (
											<span className="badge badge-secondary badge-sm">
												<PenLine className="mr-1 size-3" aria-hidden="true" />
												更新
											</span>
										)}
									</td>
									<td className="font-medium">{update.title}</td>
									<td className="text-base-content/70">{update.circleName}</td>
									<td className="text-base-content/70">{update.date}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
