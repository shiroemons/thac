import { Hash, Lock, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface TagBadgeProps {
	name: string;
	isLocked?: boolean;
	onRemove?: () => void;
	className?: string;
}

function TagBadge({ name, isLocked, onRemove, className }: TagBadgeProps) {
	return (
		<span
			data-slot="tag-badge"
			className={cn(
				"badge badge-outline badge-sm inline-flex items-center gap-1 whitespace-nowrap",
				className,
			)}
		>
			<Hash className="h-3 w-3" />
			<span>{name}</span>
			{isLocked && <Lock className="h-3 w-3" />}
			{onRemove && !isLocked && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
					aria-label={`${name}タグを削除`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</span>
	);
}

export type { TagBadgeProps };
export { TagBadge };
