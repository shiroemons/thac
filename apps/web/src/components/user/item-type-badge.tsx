import { Disc3, Music, UserRound, Users } from "lucide-react";
import type { CollectionItemType } from "@/lib/api-client";

interface ItemTypeBadgeProps {
	itemType: CollectionItemType;
	size?: "sm" | "md";
}

const ITEM_TYPE_CONFIG: Record<
	CollectionItemType,
	{ label: string; badgeClass: string; icon: typeof Music }
> = {
	track: {
		label: "楽曲",
		badgeClass: "badge-info",
		icon: Music,
	},
	release: {
		label: "アルバム",
		badgeClass: "badge-secondary",
		icon: Disc3,
	},
	circle: {
		label: "サークル",
		badgeClass: "badge-success",
		icon: Users,
	},
	artist: {
		label: "アーティスト",
		badgeClass: "badge-accent",
		icon: UserRound,
	},
};

export function ItemTypeBadge({
	itemType,
	size = "sm",
}: ItemTypeBadgeProps): React.ReactNode {
	const config = ITEM_TYPE_CONFIG[itemType];
	const Icon = config.icon;
	const sizeClass = size === "sm" ? "badge-sm" : "";

	return (
		<span className={`badge ${config.badgeClass} ${sizeClass} gap-1`}>
			<Icon className="size-3" />
			{config.label}
		</span>
	);
}
