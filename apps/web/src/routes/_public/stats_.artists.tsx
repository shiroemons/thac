import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, UserRound } from "lucide-react";
import {
	EmptyState,
	PublicBreadcrumb,
	RankBadge,
	RankingList,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { artistsRankingInfiniteQueryOptions } from "@/lib/public-query-options";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/stats_/artists")({
	head: () => createPageHead("アーティスト楽曲数ランキング"),
	component: ArtistsRankingPage,
});

function ArtistsRankingPage() {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(artistsRankingInfiniteQueryOptions(PAGE_SIZE));

	// ページデータをフラット化
	const artists = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "統計", href: "/stats" },
					{ label: "アーティスト楽曲数ランキング" },
				]}
			/>

			{/* ヘッダー */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-content">
						<Sparkles className="size-7" aria-hidden="true" />
					</div>
					<div>
						<h1 className="font-bold text-2xl md:text-3xl">
							アーティスト楽曲数ランキング
						</h1>
						<p className="mt-1 text-base-content/60">
							楽曲数が多いアーティスト · {formatNumber(total)}件
						</p>
					</div>
				</div>
			</div>

			{/* コンテンツ */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			) : artists.length === 0 ? (
				<EmptyState
					type="search"
					title="ランキングデータがありません"
					description="データが存在しません"
				/>
			) : (
				<div className="glass-card overflow-hidden rounded-2xl">
					<RankingList
						items={artists}
						getCount={(artist) => artist.count}
						renderItem={(artist, rank, medal) => (
							<Link
								key={artist.id}
								to="/artists/$id"
								params={{ id: artist.id }}
								preload="intent"
								className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-base-content/5"
							>
								<RankBadge rank={rank} medal={medal} />
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
									<UserRound
										className="size-5 text-accent-content"
										aria-hidden="true"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<span className="block truncate font-medium transition-colors group-hover:text-primary">
										{artist.name}
									</span>
								</div>
								<span className="whitespace-nowrap rounded-full bg-base-content/5 px-2.5 py-1 text-base-content/60 text-xs">
									{formatNumber(artist.count)} 曲
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
