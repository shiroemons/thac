import { Filter, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
	/** ドロワーの開閉状態 */
	isOpen: boolean;
	/** ドロワーを閉じるコールバック */
	onClose: () => void;
	/** ドロワーのタイトル */
	title?: string;
	/** フィルターコントロール */
	children: ReactNode;
	/** 適用ボタンのコールバック（省略可能） */
	onApply?: () => void;
	/** リセットボタンのコールバック（省略可能） */
	onReset?: () => void;
	/** トリガーボタンのクラス名 */
	triggerClassName?: string;
	/** アクティブなフィルター数（バッジ表示用） */
	activeFilterCount?: number;
}

/**
 * FilterDrawerTrigger: モバイル用フィルタートリガーボタン
 *
 * md以上の画面では非表示
 */
export function FilterDrawerTrigger({
	onClick,
	className,
	activeFilterCount,
}: {
	onClick: () => void;
	className?: string;
	activeFilterCount?: number;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"btn btn-primary gap-2 md:hidden",
				"min-h-11 px-4",
				"transition-all duration-300",
				className,
			)}
			aria-label="フィルターを開く"
		>
			<Filter className="size-5" aria-hidden="true" />
			<span>フィルター</span>
			{activeFilterCount !== undefined && activeFilterCount > 0 && (
				<span className="badge badge-sm badge-secondary">
					{activeFilterCount}
				</span>
			)}
		</button>
	);
}

/**
 * FilterDrawer: モバイル用フィルタードロワー
 *
 * - 画面下部からスライドアップ表示
 * - md以上の画面では非表示（デスクトップでは別のフィルターUIを使用）
 * - glass-card スタイリング
 * - 適用/リセットボタン（オプション）
 */
export function FilterDrawer({
	isOpen,
	onClose,
	title = "フィルター",
	children,
	onApply,
	onReset,
}: Omit<FilterDrawerProps, "triggerClassName" | "activeFilterCount">) {
	if (!isOpen) return null;

	const handleApply = () => {
		onApply?.();
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 md:hidden"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 animate-[fadeIn_300ms_ease-out] bg-black/60"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
				role="button"
				tabIndex={0}
				aria-label="フィルターを閉じる（背景クリック）"
			/>

			{/* Drawer - slides up from bottom */}
			<aside
				className={cn(
					"glass-card-strong",
					"absolute right-0 bottom-0 left-0",
					"max-h-[85vh] overflow-hidden",
					"rounded-t-3xl shadow-2xl",
					"animate-[slideInFromBottom_300ms_ease-out]",
					"flex flex-col",
				)}
			>
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-base-content/10 border-b p-4">
					<div className="flex items-center gap-2">
						<Filter className="size-5 text-primary" aria-hidden="true" />
						<span className="font-bold text-lg">{title}</span>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-circle btn-sm transition-all duration-300 hover:bg-base-200/60"
						aria-label="フィルターを閉じる"
						onClick={onClose}
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Scroll indicator bar */}
				<div className="flex justify-center py-2">
					<div className="h-1 w-12 rounded-full bg-base-content/20" />
				</div>

				{/* Content - scrollable */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
					{children}
				</div>

				{/* Footer with action buttons */}
				{(onApply || onReset) && (
					<div className="shrink-0 border-base-content/10 border-t bg-base-100/50 p-4">
						<div className="flex gap-3">
							{onReset && (
								<button
									type="button"
									onClick={onReset}
									className="btn btn-ghost flex-1 gap-2"
								>
									<RotateCcw className="size-4" aria-hidden="true" />
									リセット
								</button>
							)}
							{onApply && (
								<button
									type="button"
									onClick={handleApply}
									className="btn btn-primary flex-1"
								>
									適用
								</button>
							)}
						</div>
					</div>
				)}
			</aside>
		</div>
	);
}

export type { FilterDrawerProps };
