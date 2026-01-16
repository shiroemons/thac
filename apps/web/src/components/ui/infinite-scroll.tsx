import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
	onLoadMore: () => void;
	isLoading: boolean;
	hasMore: boolean;
	loadedCount: number;
	totalCount: number;
	className?: string;
	threshold?: number;
	rootMargin?: string;
}

/**
 * 無限スクロールコンポーネント
 * Intersection Observer APIを使用してスクロール検出を行う
 * useInfiniteQueryと組み合わせて使用する
 */
function InfiniteScroll({
	onLoadMore,
	isLoading,
	hasMore,
	loadedCount,
	totalCount,
	className,
	threshold = 0.1,
	rootMargin = "100px",
}: InfiniteScrollProps) {
	const observerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = observerRef.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoading) {
					onLoadMore();
				}
			},
			{ threshold, rootMargin },
		);

		observer.observe(element);

		return () => observer.disconnect();
	}, [onLoadMore, hasMore, isLoading, threshold, rootMargin]);

	if (totalCount === 0) {
		return null;
	}

	return (
		<div className={cn("flex flex-col items-center gap-2 py-4", className)}>
			<p className="text-base-content/70 text-sm">
				{loadedCount} / {totalCount} 件を表示中
			</p>
			{hasMore ? (
				<div ref={observerRef} className="flex items-center justify-center">
					{isLoading && (
						<div className="flex items-center gap-2">
							<span className="loading loading-spinner loading-sm" />
							<span className="text-base-content/70 text-sm">
								読み込み中...
							</span>
						</div>
					)}
				</div>
			) : (
				<p className="text-base-content/50 text-sm">すべて表示しました</p>
			)}
		</div>
	);
}

export { InfiniteScroll };
export type { InfiniteScrollProps };
