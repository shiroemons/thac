import type * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DetailPageSkeletonProps extends React.ComponentProps<"div"> {
	/** パンくずを表示するか（デフォルト: true） */
	showBreadcrumb?: boolean;
	/** ヘッダーを表示するか（デフォルト: true） */
	showHeader?: boolean;
	/** バッジを表示するか（デフォルト: false） */
	showBadge?: boolean;
	/** カードの数（デフォルト: 1） */
	cardCount?: number;
	/** カードあたりのフィールド数（デフォルト: 6） */
	fieldsPerCard?: number;
}

/** 詳細ページ用のスケルトンコンポーネント */
function DetailPageSkeleton({
	showBreadcrumb = true,
	showHeader = true,
	showBadge = false,
	cardCount = 1,
	fieldsPerCard = 6,
	className,
	...props
}: DetailPageSkeletonProps) {
	return (
		<div
			className={cn("container mx-auto space-y-6 p-6", className)}
			{...props}
		>
			{/* パンくずナビゲーション */}
			{showBreadcrumb && (
				<nav className="breadcrumbs text-sm">
					<ul className="flex items-center gap-2">
						<li>
							<Skeleton className="h-4 w-24" />
						</li>
						<li>
							<Skeleton className="h-4 w-32" />
						</li>
					</ul>
				</nav>
			)}

			{/* ヘッダー */}
			{showHeader && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{/* 戻るボタン */}
						<Skeleton className="h-8 w-8 rounded" />
						{/* タイトル */}
						<Skeleton className="h-8 w-48" />
						{/* バッジ */}
						{showBadge && <Skeleton className="h-6 w-20 rounded-full" />}
					</div>
					{/* 編集ボタン */}
					<Skeleton className="h-8 w-20" />
				</div>
			)}

			{/* カード */}
			{Array.from({ length: cardCount }).map((_, cardIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: スケルトン要素は静的で並べ替えが発生しないため
				<div key={cardIndex} className="card bg-base-100 shadow-xl">
					<div className="card-body">
						{/* カードタイトル */}
						<Skeleton className="h-6 w-32" />

						{/* フィールドグリッド */}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{Array.from({ length: fieldsPerCard }).map((_, fieldIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: スケルトン要素は静的で並べ替えが発生しないため
								<div key={fieldIndex}>
									{/* ラベル */}
									<Skeleton className="mb-1 h-4 w-20" />
									{/* 値 */}
									<Skeleton className="h-5 w-40" />
								</div>
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export { DetailPageSkeleton };
