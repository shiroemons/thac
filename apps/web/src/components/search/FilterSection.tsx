import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterSectionProps {
	/** セクションのタイトル */
	title: string;
	/** 選択中のアイテム数（バッジ表示用） */
	selectedCount?: number;
	/** 展開状態 */
	isOpen: boolean;
	/** 展開状態の変更ハンドラ */
	onToggle: () => void;
	/** クリアハンドラ（選択中のアイテムがある場合に表示） */
	onClear?: () => void;
	/** 子要素 */
	children: ReactNode;
	/** カスタムクラス名 */
	className?: string;
}

/**
 * 詳細検索のフィルターセクション（アコーディオン）
 *
 * - ヘッダー全体がクリック可能
 * - 選択中のアイテム数をバッジで表示
 * - 「クリア」ボタンで選択をリセット
 * - スムーズなアニメーションで開閉
 */
export function FilterSection({
	title,
	selectedCount = 0,
	isOpen,
	onToggle,
	onClear,
	children,
	className,
}: FilterSectionProps) {
	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onClear?.();
	};

	return (
		<div className={cn("border-base-300 border-b last:border-b-0", className)}>
			{/* ヘッダー（クリック可能） */}
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-base-200/50"
			>
				<div className="flex items-center gap-2">
					{/* 展開アイコン */}
					{isOpen ? (
						<ChevronDown className="h-4 w-4 text-base-content/60" />
					) : (
						<ChevronRight className="h-4 w-4 text-base-content/60" />
					)}

					{/* タイトル */}
					<span className="font-medium text-base-content">{title}</span>

					{/* 選択数バッジ */}
					{selectedCount > 0 && (
						<span className="badge badge-primary badge-sm">
							{selectedCount}
						</span>
					)}
				</div>

				{/* クリアボタン */}
				{selectedCount > 0 && onClear && (
					<button
						type="button"
						onClick={handleClear}
						className="rounded px-2 py-1 text-base-content/60 text-xs transition-colors hover:bg-base-300 hover:text-base-content"
					>
						クリア
					</button>
				)}
			</button>

			{/* コンテンツ（展開時のみ表示） */}
			<div
				className={cn(
					"transition-all duration-200 ease-in-out",
					isOpen ? "opacity-100" : "max-h-0 overflow-hidden opacity-0",
				)}
			>
				<div className="px-4 pb-4">{children}</div>
			</div>
		</div>
	);
}
