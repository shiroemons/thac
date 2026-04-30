import { Globe, Link, Lock } from "lucide-react";
import type { UserCollectionVisibility } from "@/lib/api-client";

interface VisibilityBadgeProps {
	visibility: UserCollectionVisibility;
	size?: "sm" | "md";
}

const VISIBILITY_CONFIG: Record<
	UserCollectionVisibility,
	{ label: string; badgeClass: string; icon: typeof Lock }
> = {
	private: {
		label: "非公開",
		badgeClass: "badge-ghost",
		icon: Lock,
	},
	unlisted: {
		label: "限定公開",
		badgeClass: "badge-info",
		icon: Link,
	},
	public: {
		label: "公開",
		badgeClass: "badge-success",
		icon: Globe,
	},
};

export function VisibilityBadge({
	visibility,
	size = "sm",
}: VisibilityBadgeProps): React.ReactNode {
	const config = VISIBILITY_CONFIG[visibility];
	const Icon = config.icon;
	const sizeClass = size === "sm" ? "badge-sm" : "";

	return (
		<span
			className={`badge ${config.badgeClass} ${sizeClass} gap-1 whitespace-nowrap`}
		>
			<Icon className="size-3" />
			{config.label}
		</span>
	);
}
