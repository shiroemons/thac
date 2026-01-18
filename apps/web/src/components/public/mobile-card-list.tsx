import type { ReactNode } from "react";
import { Card } from "../ui/card";

export interface MobileCardListProps<T> {
	/** Array of items to render */
	items: T[];
	/** Render function for each card */
	renderCard: (item: T, index: number) => ReactNode;
	/** Function to extract unique key for each item */
	keyExtractor: (item: T) => string;
	/** Message to display when items array is empty */
	emptyMessage?: string;
	/** Optional className for the container */
	className?: string;
}

/**
 * MobileCardList - A mobile-optimized card list component
 *
 * Displays items as cards on mobile (sm breakpoint and below).
 * Automatically hides on larger screens where table views are shown.
 *
 * Features:
 * - Touch-friendly tap targets (minimum 44px as per WCAG 2.1)
 * - Glass-card styling with consistent spacing
 * - Responsive visibility (hidden on sm: and above)
 */
export function MobileCardList<T>({
	items,
	renderCard,
	keyExtractor,
	emptyMessage = "データがありません",
	className,
}: MobileCardListProps<T>) {
	// Only visible on mobile (hidden on sm: breakpoint and above)
	if (items.length === 0) {
		return (
			<div className={`sm:hidden ${className ?? ""}`}>
				<Card variant="glass" className="p-6 text-center">
					<p className="text-base-content/60 text-sm">{emptyMessage}</p>
				</Card>
			</div>
		);
	}

	return (
		<div className={`space-y-3 sm:hidden ${className ?? ""}`}>
			{items.map((item, index) => (
				<div
					key={keyExtractor(item)}
					className="min-h-[44px]" // WCAG 2.1 minimum touch target size
				>
					{renderCard(item, index)}
				</div>
			))}
		</div>
	);
}

/**
 * MobileCardItem - A pre-styled card item for use within MobileCardList
 *
 * Provides consistent glass-card styling with proper padding
 * and touch-friendly sizing.
 */
export interface MobileCardItemProps {
	children: ReactNode;
	className?: string;
	/** Optional onClick handler */
	onClick?: () => void;
}

export function MobileCardItem({
	children,
	className,
	onClick,
}: MobileCardItemProps) {
	const baseClasses =
		"min-h-[44px] p-4 transition-all duration-200 active:scale-[0.98]";

	if (onClick) {
		return (
			<Card
				variant="glass"
				hoverEffect="glow"
				className={`${baseClasses} cursor-pointer ${className ?? ""}`}
				onClick={onClick}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClick();
					}
				}}
			>
				{children}
			</Card>
		);
	}

	return (
		<Card variant="glass" className={`${baseClasses} ${className ?? ""}`}>
			{children}
		</Card>
	);
}
