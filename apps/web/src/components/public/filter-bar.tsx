import { cn } from "@/lib/utils";

interface FilterBarProps {
	children: React.ReactNode;
	className?: string;
	/** ラベルテキスト（オプション） */
	label?: string;
	/** グループのaria-label */
	"aria-label"?: string;
}

/**
 * FilterBar: 統一されたフィルターバーコンテナ
 *
 * デザインシステム準拠:
 * - glass-card-light スタイル（背景透過 + blur）
 * - rounded-2xl
 * - 適切なスペーシング
 */
export function FilterBar({
	children,
	className,
	label,
	...props
}: FilterBarProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<span className="block font-medium text-base-content/70 text-sm">
					{label}
				</span>
			)}
			<div
				role="group"
				aria-label={props["aria-label"] ?? label}
				className="glass-card-light flex flex-wrap gap-2 rounded-2xl p-2"
			>
				{children}
			</div>
		</div>
	);
}

interface FilterBarSectionProps {
	children: React.ReactNode;
	className?: string;
	/** セパレータを表示するか */
	withSeparator?: boolean;
}

/**
 * FilterBarSection: フィルターバー内のセクション区切り
 */
export function FilterBarSection({
	children,
	className,
	withSeparator = false,
}: FilterBarSectionProps) {
	return (
		<>
			{withSeparator && (
				<div className="mx-1 h-8 w-px self-center bg-base-content/10" />
			)}
			<div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
		</>
	);
}

interface FilterBarGroupProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * FilterBarGroup: インラインでフィルターをグループ化
 */
export function FilterBarGroup({ children, className }: FilterBarGroupProps) {
	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			{children}
		</div>
	);
}

export type { FilterBarProps, FilterBarSectionProps, FilterBarGroupProps };
