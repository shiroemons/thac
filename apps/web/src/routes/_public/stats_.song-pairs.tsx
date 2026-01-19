import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Combine } from "lucide-react";
import {
	EmptyState,
	PublicBreadcrumb,
	RankBadge,
	RankingList,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { songPairsRankingInfiniteQueryOptions } from "@/lib/public-query-options";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/stats_/song-pairs")({
	head: () => createPageHead("原曲2曲組み合わせランキング"),
	component: SongPairsRankingPage,
});

function SongPairsRankingPage() {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(songPairsRankingInfiniteQueryOptions(PAGE_SIZE));

	// ページデータをフラット化
	const pairs = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "統計", href: "/stats" },
					{ label: "原曲2曲組み合わせランキング" },
				]}
			/>

			{/* ヘッダー */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 text-pink-500">
						<Combine className="size-7" aria-hidden="true" />
					</div>
					<div>
						<h1 className="font-bold text-2xl md:text-3xl">
							原曲2曲組み合わせランキング
						</h1>
						<p className="mt-1 text-base-content/60">
							2曲の原曲を組み合わせたアレンジ · {formatNumber(total)}件
						</p>
					</div>
				</div>
			</div>

			{/* コンテンツ */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			) : pairs.length === 0 ? (
				<EmptyState
					type="search"
					title="ランキングデータがありません"
					description="データが存在しません"
				/>
			) : (
				<div className="glass-card overflow-hidden rounded-2xl">
					<RankingList
						items={pairs}
						getCount={(pair) => pair.count}
						renderItem={(pair, rank, medal) => (
							<div
								key={`${pair.song1Id}-${pair.song2Id}`}
								className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-base-content/5"
							>
								<RankBadge rank={rank} medal={medal} />
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 text-white">
									<Combine className="size-5" aria-hidden="true" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-1">
										<Link
											to="/original-songs/$id"
											params={{ id: pair.song1Id }}
											preload="intent"
											className="truncate font-medium transition-colors hover:text-primary"
										>
											{pair.song1Name}
										</Link>
										<span className="text-base-content/40">×</span>
										<Link
											to="/original-songs/$id"
											params={{ id: pair.song2Id }}
											preload="intent"
											className="truncate font-medium transition-colors hover:text-primary"
										>
											{pair.song2Name}
										</Link>
									</div>
								</div>
								<span className="whitespace-nowrap rounded-full bg-base-content/5 px-2.5 py-1 text-base-content/60 text-xs">
									{formatNumber(pair.count)} アレンジ
								</span>
							</div>
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
