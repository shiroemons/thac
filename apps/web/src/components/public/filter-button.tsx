import { cn } from "@/lib/utils";

type FilterButtonSize = "sm" | "md" | "lg";

interface FilterButtonProps {
	children: React.ReactNode;
	isActive?: boolean;
	onClick?: () => void;
	size?: FilterButtonSize;
	className?: string;
	"aria-pressed"?: boolean;
	"aria-label"?: string;
	disabled?: boolean;
}

const sizeClasses: Record<FilterButtonSize, string> = {
	sm: "min-h-9 min-w-9 px-3 text-sm",
	md: "min-h-11 min-w-11 px-4 text-sm",
	lg: "min-h-12 min-w-12 px-5 text-base",
};

/**
 * FilterButton: 統一されたフィルターボタンコンポーネント
 *
 * デザインシステム準拠:
 * - min-h-11 min-w-11 のタップターゲット確保（size="md"）
 * - duration-300 トランジション
 * - /70, /60 の透過度
 * - rounded-xl
 * - ホバー効果: ring-2 ring-primary/10
 */
export function FilterButton({
	children,
	isActive = false,
	onClick,
	size = "md",
	className,
	disabled = false,
	...props
}: FilterButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-pressed={props["aria-pressed"] ?? isActive}
			aria-label={props["aria-label"]}
			className={cn(
				// Base styles
				"inline-flex items-center justify-center gap-2",
				"whitespace-nowrap font-medium",
				"rounded-xl",
				"transition-all duration-300",
				// Focus styles
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				// Hover styles (non-active)
				!isActive && !disabled && "hover:ring-2 hover:ring-primary/10",
				// Size
				sizeClasses[size],
				// Active state
				isActive
					? "bg-primary text-primary-content shadow-sm"
					: "bg-base-200/70 text-base-content/70 hover:bg-base-200 hover:text-base-content",
				// Disabled state
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
		>
			{children}
		</button>
	);
}

export type { FilterButtonProps, FilterButtonSize };
