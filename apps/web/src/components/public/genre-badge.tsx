import * as LucideIcons from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface GenreBadgeProps {
	code: string;
	name: string;
	color: string;
	icon?: string;
	className?: string;
}

/**
 * 値がReactコンポーネントかどうかを判定
 */
function isReactComponent(
	value: unknown,
): value is React.ComponentType<{ className?: string }> {
	if (typeof value === "function") return true;
	if (value && typeof value === "object" && "$$typeof" in value) return true;
	return false;
}

/**
 * Lucide icon名からコンポーネントを取得
 */
function getLucideIcon(
	iconName: string,
): React.ComponentType<{ className?: string }> | null {
	const pascalCase = iconName
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon loading is intentional
	const IconComponent = LucideIcons[pascalCase as keyof typeof LucideIcons];
	if (isReactComponent(IconComponent)) {
		return IconComponent;
	}
	return null;
}

/**
 * 公開画面用ジャンルバッジコンポーネント
 */
function GenreBadge({ code, name, color, icon, className }: GenreBadgeProps) {
	const IconComponent = icon ? getLucideIcon(icon) : null;

	return (
		<span
			data-slot="genre-badge"
			data-code={code}
			className={cn(
				"badge badge-sm inline-flex items-center gap-1 whitespace-nowrap text-xs",
				className,
			)}
			style={{
				backgroundColor: `${color}33`,
				borderColor: `${color}66`,
				color: "var(--color-base-content)",
			}}
		>
			{IconComponent && <IconComponent className="size-3" />}
			<span>{name}</span>
		</span>
	);
}

export { GenreBadge };
export type { GenreBadgeProps };
