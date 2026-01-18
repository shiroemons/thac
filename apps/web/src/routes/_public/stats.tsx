import { useSuspenseQuery } from "@tanstack/react-query";
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
import { Suspense } from "react";
import { PublicBreadcrumb } from "@/components/public";
import {
	RankingsSkeleton,
	RecentUpdatesSkeleton,
} from "@/components/public/stats-skeleton";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { publicApi } from "@/lib/public-api";
import {
	publicRecentUpdatesQueryOptions,
	publicStatsRankingsQueryOptions,
} from "@/lib/public-query-options";

export const Route = createFileRoute("/_public/stats")({
	head: () => createPageHead("統計"),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	loader: async ({ context }) => {
		// 基本統計を await（ブロッキング）
		const stats = await publicApi.stats();

		// ランキング・更新を prefetchQuery（非ブロッキング）
		context.queryClient.prefetchQuery(publicStatsRankingsQueryOptions());
		context.queryClient.prefetchQuery(publicRecentUpdatesQueryOptions());

		return { stats };
	},
	component: StatsPage,
});

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
					className={`flex size-11 items-center justify-center rounded-xl ${bgColor} ${color} transition-transform duration-300 group-hover:scale-110`}
				>
					<Icon className="size-5" aria-hidden="true" />
				</div>
				{trend !== undefined && (
					<div className="flex items-center gap-1 rounded-full bg-success px-2 py-1 text-success-content text-xs">
						<TrendingUp className="size-3" aria-hidden="true" />
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
			<Link to={href} preload="intent" className="block">
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
		if (r <= 3) {
			return ""; // メダル絵文字表示時は背景なし
		}
		return "bg-base-content/10 text-base-content/70";
	};

	const getMedalOrRank = (r: number) => {
		switch (r) {
			case 1:
				return "🥇";
			case 2:
				return "🥈";
			case 3:
				return "🥉";
			default:
				return r;
		}
	};

	return (
		<Link
			to={href}
			preload="intent"
			className="group flex items-center gap-3 rounded-xl p-3 transition-all duration-300 hover:bg-base-content/5"
		>
			<span
				className={`flex size-8 items-center justify-center rounded-lg font-bold text-sm ${getRankStyle(rank)}`}
			>
				{getMedalOrRank(rank)}
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

// Calculate ranks with ties (1, 1, 3, 4, 4, 6 format)
function calculateRanks(items: Array<{ count: number }>): number[] {
	const ranks: number[] = [];

	for (let i = 0; i < items.length; i++) {
		if (i === 0) {
			ranks.push(1);
		} else if (items[i].count === items[i - 1].count) {
			// Same count as previous - use same rank
			ranks.push(ranks[i - 1]);
		} else {
			// Different count - rank is position + 1
			ranks.push(i + 1);
		}
	}

	return ranks;
}

function RankingsSection() {
	const { data: rankings } = useSuspenseQuery(
		publicStatsRankingsQueryOptions(),
	);

	const popularSongsRanks = calculateRanks(rankings.popularSongs);
	const activeCirclesRanks = calculateRanks(rankings.activeCircles);
	const activeArtistsRanks = calculateRanks(rankings.activeArtists);

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			{/* Popular songs ranking */}
			<section className="glass-card overflow-hidden rounded-2xl">
				<div className="flex items-center justify-between border-base-content/10 border-b p-5">
					<div className="flex items-center gap-2">
						<Trophy className="size-5 text-yellow-500" aria-hidden="true" />
						<h2 className="font-bold">原曲アレンジ数</h2>
					</div>
					<Link
						to="/stats/original-songs"
						preload="intent"
						className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary"
					>
						すべて見る
						<span className="transition-transform group-hover:translate-x-0.5">
							→
						</span>
					</Link>
				</div>
				<div className="divide-y divide-base-content/5 px-2 py-1">
					{rankings.popularSongs.map((song, index) => (
						<RankingItem
							key={song.id}
							rank={popularSongsRanks[index]}
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
						<Crown className="size-5 text-primary" aria-hidden="true" />
						<h2 className="font-bold">サークル作品数</h2>
					</div>
					<Link
						to="/stats/circles"
						preload="intent"
						className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary"
					>
						すべて見る
						<span className="transition-transform group-hover:translate-x-0.5">
							→
						</span>
					</Link>
				</div>
				<div className="divide-y divide-base-content/5 px-2 py-1">
					{rankings.activeCircles.map((circle, index) => (
						<RankingItem
							key={circle.id}
							rank={activeCirclesRanks[index]}
							name={circle.name}
							count={circle.count}
							unit="作品"
							href={`/circles/${circle.id}`}
						/>
					))}
				</div>
			</section>

			{/* Active artists ranking */}
			<section className="glass-card overflow-hidden rounded-2xl">
				<div className="flex items-center justify-between border-base-content/10 border-b p-5">
					<div className="flex items-center gap-2">
						<Sparkles className="size-5 text-accent" aria-hidden="true" />
						<h2 className="font-bold">アーティスト楽曲数</h2>
					</div>
					<Link
						to="/stats/artists"
						preload="intent"
						className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary"
					>
						すべて見る
						<span className="transition-transform group-hover:translate-x-0.5">
							→
						</span>
					</Link>
				</div>
				<div className="divide-y divide-base-content/5 px-2 py-1">
					{rankings.activeArtists.map((artist, index) => (
						<RankingItem
							key={artist.id}
							rank={activeArtistsRanks[index]}
							name={artist.name}
							count={artist.count}
							unit="曲"
							href={`/artists/${artist.id}`}
						/>
					))}
				</div>
			</section>
		</div>
	);
}

function RecentUpdatesSection() {
	const { data: updates } = useSuspenseQuery(publicRecentUpdatesQueryOptions());

	return (
		<section className="glass-card overflow-hidden rounded-2xl">
			<div className="flex items-center justify-between border-base-content/10 border-b p-5">
				<div className="flex items-center gap-2">
					<Calendar className="size-5 text-info" aria-hidden="true" />
					<h2 className="font-bold">最近の更新</h2>
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-base-content/5 border-b text-left text-base-content/60 text-sm">
							<th className="px-5 py-3 font-medium">状態</th>
							<th className="px-5 py-3 font-medium">タイトル</th>
							<th className="px-5 py-3 font-medium">サークル</th>
							<th className="px-5 py-3 font-medium">日付</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-base-content/5">
						{updates.data.map((update) => (
							<tr
								key={update.id}
								className="transition-colors hover:bg-base-content/5"
							>
								<td className="px-5 py-4">
									{update.type === "new" ? (
										<span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-primary-content text-xs">
											<Sparkles className="size-3" aria-hidden="true" />
											NEW
										</span>
									) : (
										<span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-secondary-content text-xs">
											<PenLine className="size-3" aria-hidden="true" />
											更新
										</span>
									)}
								</td>
								<td className="px-5 py-4">
									<Link
										to="/releases/$id"
										params={{ id: update.id }}
										preload="intent"
										className="font-medium hover:text-primary"
									>
										{update.title}
									</Link>
								</td>
								<td className="px-5 py-4">
									{update.circleId && update.circleName ? (
										<Link
											to="/circles/$id"
											params={{ id: update.circleId }}
											preload="intent"
											className="text-base-content/60 hover:text-primary"
										>
											{update.circleName}
										</Link>
									) : (
										<span className="text-base-content/40">-</span>
									)}
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
	);
}

function StatsPage() {
	const { stats } = Route.useLoaderData();

	// プロパティレベルでフォールバックを適用
	const displayStats = {
		events: stats?.events ?? 0,
		circles: stats?.circles ?? 0,
		artists: stats?.artists ?? 0,
		tracks: stats?.tracks ?? 0,
		originalSongs: stats?.originalSongs ?? 0,
		releases: stats?.releases ?? 0,
	};

	return (
		<div className="space-y-8">
			<PublicBreadcrumb items={[{ label: "統計" }]} />

			{/* Hero header */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-content">
						<BarChart3 className="size-7" aria-hidden="true" />
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
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					<StatCard
						icon={Music}
						count={displayStats.originalSongs}
						label="原曲"
						href="/original-songs"
						color="text-secondary"
					/>
					<StatCard
						icon={Calendar}
						count={displayStats.events}
						label="イベント"
						href="/events"
						color="text-info"
					/>
					<StatCard
						icon={Users}
						count={displayStats.circles}
						label="サークル"
						href="/circles"
						color="text-primary"
					/>
					<StatCard
						icon={Users}
						count={displayStats.artists}
						label="アーティスト"
						href="/artists"
						color="text-accent"
					/>
					<StatCard
						icon={Disc3}
						count={displayStats.releases}
						label="作品"
						color="text-warning"
					/>
					<StatCard
						icon={Disc3}
						count={displayStats.tracks}
						label="アレンジ"
						color="text-success"
					/>
				</div>
			</section>

			{/* Ranking sections with Suspense */}
			<Suspense fallback={<RankingsSkeleton />}>
				<RankingsSection />
			</Suspense>

			{/* Recent updates with Suspense */}
			<Suspense fallback={<RecentUpdatesSkeleton />}>
				<RecentUpdatesSection />
			</Suspense>
		</div>
	);
}
