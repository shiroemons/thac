import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Hash, Loader2 } from "lucide-react";
import { publicTagCloudQueryOptions } from "@/lib/public-query-options";
import { cn } from "@/lib/utils";

interface TagCloudProps {
	limit?: number;
	className?: string;
}

/**
 * タグクラウド用のフォントサイズクラスを取得
 * weight 1-5 に対応
 */
function getTagSizeClass(weight: number): string {
	switch (weight) {
		case 5:
			return "text-xl font-bold";
		case 4:
			return "text-lg font-semibold";
		case 3:
			return "text-base font-medium";
		case 2:
			return "text-sm";
		default:
			return "text-xs";
	}
}

/**
 * 公開画面用タグクラウドコンポーネント
 * 使用頻度に応じてフォントサイズを変更
 */
function TagCloud({ limit = 50, className }: TagCloudProps) {
	const { data, isLoading, error } = useQuery(
		publicTagCloudQueryOptions(limit),
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
				<p className="text-error">タグの読み込みに失敗しました</p>
			</div>
		);
	}

	if (!data || data.data.length === 0) {
		return (
			<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
				<p className="text-base-content/60">タグがありません</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-base-100 p-6 shadow-sm",
				className,
			)}
		>
			{data.data.map((tag) => (
				<Link
					key={tag.id}
					to="/tags/$tagId"
					params={{ tagId: tag.id }}
					preload="intent"
					className={cn(
						"inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-all duration-200",
						"bg-base-200 text-base-content/80 hover:bg-neutral hover:text-neutral-content",
						getTagSizeClass(tag.weight),
					)}
					title={`${tag.name}: ${tag.count}件`}
				>
					<Hash
						className={cn(
							tag.weight >= 4
								? "size-4"
								: tag.weight >= 2
									? "size-3"
									: "size-2",
						)}
					/>
					{tag.name}
				</Link>
			))}
		</div>
	);
}

export type { TagCloudProps };
export { TagCloud };
