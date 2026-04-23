import { cn } from "@/lib/utils";
import { TagBadge } from "./tag-badge";

interface Tag {
	id: string;
	name: string;
}

interface TagBadgeListProps {
	tags: Tag[];
	maxDisplay?: number;
	className?: string;
}

/**
 * 公開画面用タグバッジリストコンポーネント
 * maxDisplayを超える場合は「+N」表示
 */
function TagBadgeList({ tags, maxDisplay, className }: TagBadgeListProps) {
	if (!tags || tags.length === 0) {
		return null;
	}

	const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
	const remainingCount = maxDisplay ? tags.length - maxDisplay : 0;

	return (
		<div className={cn("flex flex-wrap gap-1.5", className)}>
			{displayTags.map((tag) => (
				<TagBadge key={tag.id} id={tag.id} name={tag.name} />
			))}
			{remainingCount > 0 && (
				<span className="badge badge-ghost badge-sm text-base-content/60 text-xs">
					+{remainingCount}
				</span>
			)}
		</div>
	);
}

export type { Tag, TagBadgeListProps };
export { TagBadgeList };
