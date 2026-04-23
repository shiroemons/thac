import { Link } from "@tanstack/react-router";
import { Hash } from "lucide-react";

import { cn } from "@/lib/utils";

interface TagBadgeProps {
	id: string;
	name: string;
	className?: string;
}

/**
 * 公開画面用タグバッジコンポーネント
 * ハッシュタグ風デザイン、クリックでタグ詳細ページへ遷移
 */
function TagBadge({ id, name, className }: TagBadgeProps) {
	return (
		<Link
			to="/tags/$tagId"
			params={{ tagId: id }}
			preload="intent"
			className={cn(
				"badge badge-ghost badge-sm hover:badge-neutral inline-flex items-center gap-1 whitespace-nowrap text-xs transition-colors duration-200",
				className,
			)}
		>
			<Hash className="size-3" />
			<span>{name}</span>
		</Link>
	);
}

export type { TagBadgeProps };
export { TagBadge };
