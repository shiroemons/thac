import { cn } from "@/lib/utils";
import { GenreBadge } from "./genre-badge";

interface Genre {
	code: string;
	nameJa: string;
	color: string;
	icon?: string;
}

interface GenreBadgeListProps {
	genres: Genre[];
	className?: string;
}

/**
 * 公開画面用ジャンルバッジリストコンポーネント
 * 全件表示（最大5件なので省略不要）、flex-wrapで折り返し
 */
function GenreBadgeList({ genres, className }: GenreBadgeListProps) {
	if (!genres || genres.length === 0) {
		return null;
	}

	return (
		<div className={cn("flex flex-wrap gap-1.5", className)}>
			{genres.map((genre) => (
				<GenreBadge
					key={genre.code}
					code={genre.code}
					name={genre.nameJa}
					color={genre.color}
					icon={genre.icon}
				/>
			))}
		</div>
	);
}

export type { Genre, GenreBadgeListProps };
export { GenreBadgeList };
