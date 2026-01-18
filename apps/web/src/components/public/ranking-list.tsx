import type { ReactNode } from "react";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { cn } from "@/lib/utils";

// =============================================================================
// 型定義
// =============================================================================

interface RankingListProps<T> {
	/** ランキングアイテム配列 */
	items: T[];
	/** カウント値を取得する関数 */
	getCount: (item: T) => number;
	/** アイテムをレンダリング */
	renderItem: (item: T, rank: number, medal: string) => ReactNode;
	/** 次ページ取得中フラグ */
	isFetchingNextPage: boolean;
	/** 次ページがあるか */
	hasNextPage: boolean;
	/** 次ページ取得関数 */
	fetchNextPage: () => void;
	/** 総アイテム数（無限スクロールの進捗表示用） */
	totalCount?: number;
	/** スケルトンローディングの行数 */
	skeletonRows?: number;
	/** コンテナに適用するクラス名 */
	className?: string;
	/** アイテムリストに適用するクラス名 */
	listClassName?: string;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 同点順位を計算する
 * 同じカウント数のアイテムは同じ順位になる
 * 例: 1, 1, 3, 4, 4, 6...
 */
function calculateRanks(counts: number[]): number[] {
	const ranks: number[] = [];

	for (let i = 0; i < counts.length; i++) {
		if (i === 0) {
			ranks.push(1);
		} else if (counts[i] === counts[i - 1]) {
			// 前のアイテムと同じカウント → 同じ順位
			ranks.push(ranks[i - 1]);
		} else {
			// 異なるカウント → 現在のインデックス + 1
			ranks.push(i + 1);
		}
	}

	return ranks;
}

/**
 * 順位に対応するメダル絵文字または数字を取得
 */
function getMedalOrRank(rank: number): string {
	switch (rank) {
		case 1:
			return "🥇";
		case 2:
			return "🥈";
		case 3:
			return "🥉";
		default:
			return String(rank);
	}
}

// =============================================================================
// サブコンポーネント
// =============================================================================

interface RankBadgeProps {
	rank: number;
	medal: string;
}

/**
 * 順位バッジコンポーネント
 */
function RankBadge({ rank, medal }: RankBadgeProps) {
	const isMedal = rank <= 3;

	return (
		<span
			className={cn(
				"flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-sm",
				isMedal ? "" : "bg-base-content/10 text-base-content/70",
			)}
		>
			{medal}
		</span>
	);
}

// =============================================================================
// メインコンポーネント
// =============================================================================

/**
 * 無限スクロール対応のランキングリストコンポーネント
 *
 * @example
 * ```tsx
 * <RankingList
 *   items={songs}
 *   getCount={(song) => song.arrangeCount}
 *   renderItem={(song, rank, medal) => (
 *     <Link to={`/original-songs/${song.id}`}>
 *       <span>{medal}</span>
 *       <span>{song.name}</span>
 *       <span>{song.arrangeCount}曲</span>
 *     </Link>
 *   )}
 *   isFetchingNextPage={isFetchingNextPage}
 *   hasNextPage={hasNextPage}
 *   fetchNextPage={fetchNextPage}
 *   totalCount={total}
 * />
 * ```
 */
function RankingList<T>({
	items,
	getCount,
	renderItem,
	isFetchingNextPage,
	hasNextPage,
	fetchNextPage,
	totalCount,
	skeletonRows = 3,
	className,
	listClassName,
}: RankingListProps<T>) {
	// カウント配列を抽出して順位を計算
	const counts = items.map(getCount);
	const ranks = calculateRanks(counts);

	return (
		<div className={className}>
			{/* ランキングリスト */}
			<div className={cn("divide-y divide-base-content/5", listClassName)}>
				{items.map((item, index) => {
					const rank = ranks[index];
					const medal = getMedalOrRank(rank);
					return renderItem(item, rank, medal);
				})}
			</div>

			{/* 無限スクロール */}
			<InfiniteScroll
				onLoadMore={fetchNextPage}
				isLoading={isFetchingNextPage}
				hasMore={hasNextPage}
				loadedCount={items.length}
				totalCount={totalCount ?? items.length}
				skeletonRows={skeletonRows}
			/>
		</div>
	);
}

// =============================================================================
// エクスポート
// =============================================================================

export { RankingList, RankBadge, calculateRanks, getMedalOrRank };
export type { RankingListProps, RankBadgeProps };
