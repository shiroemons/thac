import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChip {
	/** 一意の識別子 */
	id: string;
	/** 表示ラベル */
	label: string;
	/** カテゴリ（オプション） */
	category?: string;
}

interface ActiveFilterChipsProps {
	/** アクティブなフィルターリスト */
	filters: FilterChip[];
	/** 個別フィルター削除時のコールバック */
	onRemove: (id: string) => void;
	/** 全クリア時のコールバック */
	onClearAll?: () => void;
	/** 全クリアボタンを表示するか */
	showClearAll?: boolean;
	className?: string;
}

/**
 * ActiveFilterChips: 選択中のフィルターをチップ/バッジとして表示
 *
 * デザインシステム準拠:
 * - duration-300 トランジション
 * - /70, /60 の透過度
 * - rounded-xl
 * - ホバー効果
 */
export function ActiveFilterChips({
	filters,
	onRemove,
	onClearAll,
	showClearAll = true,
	className,
}: ActiveFilterChipsProps) {
	if (filters.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2",
				"fade-in animate-in duration-300",
				className,
			)}
		>
			<span className="text-base-content/60 text-sm">絞り込み:</span>
			{filters.map((filter) => (
				<FilterChipBadge
					key={filter.id}
					filter={filter}
					onRemove={() => onRemove(filter.id)}
				/>
			))}
			{showClearAll && filters.length > 1 && onClearAll && (
				<button
					type="button"
					onClick={onClearAll}
					className={cn(
						"inline-flex items-center gap-1",
						"rounded-lg px-2 py-1",
						"text-base-content/60 text-xs",
						"transition-all duration-300",
						"hover:bg-base-200 hover:text-base-content",
						"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
					)}
				>
					すべてクリア
				</button>
			)}
		</div>
	);
}

interface FilterChipBadgeProps {
	filter: FilterChip;
	onRemove: () => void;
}

function FilterChipBadge({ filter, onRemove }: FilterChipBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5",
				"rounded-xl px-3 py-1.5",
				"bg-primary/10 text-primary",
				"font-medium text-sm",
				"transition-all duration-300",
				"fade-in slide-in-from-left-2 animate-in",
			)}
		>
			{filter.category && (
				<span className="text-primary/70">{filter.category}:</span>
			)}
			<span>{filter.label}</span>
			<button
				type="button"
				onClick={onRemove}
				aria-label={`${filter.label}を解除`}
				className={cn(
					"rounded-full p-0.5",
					"transition-all duration-300",
					"hover:bg-primary/20",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				)}
			>
				<X className="size-3.5" />
			</button>
		</span>
	);
}

export type { ActiveFilterChipsProps, FilterChip };
