import * as LucideIcons from "lucide-react";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface GenreBadgeProps {
	code: string;
	name: string;
	color: string;
	icon?: string;
	size?: "sm" | "md";
	onRemove?: () => void;
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

function GenreBadge({
	code,
	name,
	color,
	icon,
	size = "md",
	onRemove,
	className,
}: GenreBadgeProps) {
	const IconComponent = icon ? getLucideIcon(icon) : null;

	const sizeClasses = {
		sm: "badge-sm gap-1 text-xs",
		md: "gap-1.5 text-sm",
	};

	const iconSizeClasses = {
		sm: "size-3",
		md: "size-3.5",
	};

	return (
		<span
			data-slot="genre-badge"
			data-code={code}
			className={cn(
				"badge inline-flex items-center whitespace-nowrap transition-opacity hover:opacity-90",
				sizeClasses[size],
				className,
			)}
			style={{
				backgroundColor: `${color}40`,
				borderColor: `${color}80`,
				color: "var(--color-base-content)",
			}}
		>
			{IconComponent && <IconComponent className={iconSizeClasses[size]} />}
			<span>{name}</span>
			{onRemove && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
					aria-label={`${name}を削除`}
				>
					<XIcon className={size === "sm" ? "size-2.5" : "size-3"} />
				</button>
			)}
		</span>
	);
}

export type { GenreBadgeProps };
export { GenreBadge };
