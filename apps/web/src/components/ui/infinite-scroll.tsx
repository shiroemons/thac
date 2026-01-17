import { ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
	/** スケルトンローディングの行数（デフォルト: 3） */
	skeletonRows?: number;
	/** 「トップへ戻る」ボタンを表示するスクロール位置（デフォルト: 400px） */
	scrollTopThreshold?: number;
}

/**
 * スケルトンローディングコンポーネント
 */
function SkeletonLoader({ rows = 3 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-3 py-2">
			{Array.from({ length: rows }).map((_, index) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: スケルトンは静的なため問題なし
					key={index}
					className="flex animate-pulse items-center gap-3"
				>
					<div className="size-10 rounded-full bg-base-content/10" />
					<div className="flex flex-1 flex-col gap-2">
						<div className="h-4 w-3/4 rounded bg-base-content/10" />
						<div className="h-3 w-1/2 rounded bg-base-content/10" />
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * トップへ戻るボタンコンポーネント
 */
function ScrollToTopButton({
	visible,
	onClick,
}: {
	visible: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"glass-card-strong fixed right-6 bottom-6 z-50 flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-300",
				"hover:scale-105 hover:shadow-xl active:scale-95",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				visible
					? "pointer-events-auto translate-y-0 opacity-100"
					: "pointer-events-none translate-y-4 opacity-0",
			)}
			aria-label="トップへ戻る"
		>
			<ChevronUp className="size-6 text-base-content/70" />
		</button>
	);
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
	skeletonRows = 3,
	scrollTopThreshold = 400,
}: InfiniteScrollProps) {
	const observerRef = useRef<HTMLDivElement>(null);
	const [showScrollTop, setShowScrollTop] = useState(false);

	// スクロール位置の監視
	useEffect(() => {
		const handleScroll = () => {
			setShowScrollTop(window.scrollY > scrollTopThreshold);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [scrollTopThreshold]);

	// Intersection Observer による無限スクロール
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

	// スムーズスクロールでトップへ戻る
	const handleScrollToTop = useCallback(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	if (totalCount === 0) {
		return null;
	}

	return (
		<>
			<div className={cn("flex flex-col items-center gap-2 py-4", className)}>
				<p className="text-base-content/70 text-sm">
					{loadedCount} / {totalCount} 件を表示中
				</p>
				{hasMore ? (
					<div
						ref={observerRef}
						className="flex w-full flex-col items-center justify-center"
					>
						{isLoading ? (
							<SkeletonLoader rows={skeletonRows} />
						) : (
							<p className="text-base-content/60 text-xs">
								スクロールして続きを読み込む
							</p>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center gap-1">
						<div className="h-px w-16 bg-base-content/20" />
						<p className="text-base-content/60 text-sm">
							これ以上データがありません
						</p>
					</div>
				)}
			</div>

			{/* トップへ戻るボタン */}
			<ScrollToTopButton visible={showScrollTop} onClick={handleScrollToTop} />
		</>
	);
}

export { InfiniteScroll };
export type { InfiniteScrollProps };
