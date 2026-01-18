import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Users } from "lucide-react";
import {
	EmptyState,
	PublicBreadcrumb,
	RankBadge,
	RankingList,
} from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { circlesRankingInfiniteQueryOptions } from "@/lib/public-query-options";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/stats_/circles")({
	head: () => createPageHead("サークルリリース数ランキング"),
	component: CirclesRankingPage,
});

function CirclesRankingPage() {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(circlesRankingInfiniteQueryOptions(PAGE_SIZE));

	// ページデータをフラット化
	const circles = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "統計", href: "/stats" },
					{ label: "サークルリリース数ランキング" },
				]}
			/>

			{/* ヘッダー */}
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative flex items-center gap-4">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-content">
						<Crown className="size-7" aria-hidden="true" />
					</div>
					<div>
						<h1 className="font-bold text-2xl md:text-3xl">
							サークルリリース数ランキング
						</h1>
						<p className="mt-1 text-base-content/60">
							リリース数が多いサークル · {formatNumber(total)}件
						</p>
					</div>
				</div>
			</div>

			{/* コンテンツ */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			) : circles.length === 0 ? (
				<EmptyState
					type="search"
					title="ランキングデータがありません"
					description="データが存在しません"
				/>
			) : (
				<div className="glass-card overflow-hidden rounded-2xl">
					<RankingList
						items={circles}
						getCount={(circle) => circle.count}
						renderItem={(circle, rank, medal) => (
							<Link
								key={circle.id}
								to="/circles/$id"
								params={{ id: circle.id }}
								preload="intent"
								className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-base-content/5"
							>
								<RankBadge rank={rank} medal={medal} />
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
									<Users
										className="size-5 text-primary-content"
										aria-hidden="true"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<span className="block truncate font-medium transition-colors group-hover:text-primary">
										{circle.name}
									</span>
								</div>
								<span className="whitespace-nowrap rounded-full bg-base-content/5 px-2.5 py-1 text-base-content/60 text-xs">
									{formatNumber(circle.count)} リリース
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
