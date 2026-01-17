import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
				aria-expanded={isOpen}
				className="flex w-full items-center justify-between gap-2 px-6 py-3 text-left transition-colors hover:bg-base-200/50"
			>
				<div className="flex items-center gap-2">
					{/* 展開アイコン */}
					<ChevronDown
						className={cn(
							"h-4 w-4 text-base-content/60 transition-transform duration-200",
							isOpen ? "rotate-0" : "-rotate-90",
							"motion-reduce:transition-none",
						)}
					/>

					{/* タイトル */}
					<span className="font-medium text-base-content">{title}</span>

					{/* 選択数バッジ */}
					{selectedCount > 0 && (
						<Badge variant="primary" className="badge-sm">
							{selectedCount}
						</Badge>
					)}
				</div>

				{/* クリアボタン */}
				{selectedCount > 0 && onClear && (
					<Button
						variant="ghost"
						size="xs"
						onClick={handleClear}
						className="text-base-content/60"
					>
						クリア
					</Button>
				)}
			</button>

			{/* コンテンツ（展開時のみ表示） */}
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-200 ease-out",
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
					"motion-reduce:transition-none",
				)}
			>
				<div className="overflow-hidden">
					<div className="px-6 pb-4">{children}</div>
				</div>
			</div>
		</div>
	);
}
