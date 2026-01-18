import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Music, Trophy } from "lucide-react";
import {
	EmptyState,
	PublicBreadcrumb,
	RankBadge,
	RankingList,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { originalSongsRankingInfiniteQueryOptions } from "@/lib/public-query-options";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/stats_/original-songs")({
	head: () => createPageHead("原曲アレンジ数ランキング"),
	component: OriginalSongsRankingPage,
});

function OriginalSongsRankingPage() {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(originalSongsRankingInfiniteQueryOptions(PAGE_SIZE));

	// ページデータをフラット化
	const songs = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "統計", href: "/stats" },
					{ label: "原曲アレンジ数ランキング" },
				]}
			/>

			{/* ヘッダー */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500">
						<Trophy className="size-7" aria-hidden="true" />
					</div>
					<div>
						<h1 className="font-bold text-2xl md:text-3xl">
							原曲アレンジ数ランキング
						</h1>
						<p className="mt-1 text-base-content/60">
							アレンジ楽曲が多い原曲 · {formatNumber(total)}件
						</p>
					</div>
				</div>
			</div>

			{/* コンテンツ */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			) : songs.length === 0 ? (
				<EmptyState
					type="search"
					title="ランキングデータがありません"
					description="データが存在しません"
				/>
			) : (
				<div className="glass-card overflow-hidden rounded-2xl">
					<RankingList
						items={songs}
						getCount={(song) => song.count}
						renderItem={(song, rank, medal) => (
							<Link
								key={song.id}
								to="/original-songs/$id"
								params={{ id: song.id }}
								preload="intent"
								className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-base-content/5"
							>
								<RankBadge rank={rank} medal={medal} />
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-content">
									<Music className="size-5" aria-hidden="true" />
								</div>
								<div className="min-w-0 flex-1">
									<span className="block truncate font-medium transition-colors group-hover:text-primary">
										{song.name}
									</span>
									{song.workName && (
										<span className="block truncate text-base-content/60 text-sm">
											{song.workName}
										</span>
									)}
								</div>
								<span className="whitespace-nowrap rounded-full bg-base-content/5 px-2.5 py-1 text-base-content/60 text-xs">
									{formatNumber(song.count)} アレンジ
								</span>
							</Link>
						)}
						isFetchingNextPage={isFetchingNextPage}
						hasNextPage={hasNextPage ?? false}
						fetchNextPage={fetchNextPage}
						totalCount={total}
					/>
				</div>
			)}
		</div>
	);
}
