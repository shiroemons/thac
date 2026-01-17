import { LayoutGrid, List } from "lucide-react";
import { FilterButton } from "./filter-button";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
	value: ViewMode;
	onChange: (mode: ViewMode) => void;
}

/**
 * ViewToggle: グリッド/リスト表示切替コンポーネント
 *
 * デザインシステム準拠:
 * - min-h-11 min-w-11 のタップターゲット確保
 * - duration-300 トランジション
 * - glass-card-light スタイル
 * - rounded-2xl
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
	return (
		<div
			role="group"
			aria-label="表示切替"
			className="glass-card-light inline-flex gap-1 rounded-2xl p-1"
		>
			<FilterButton
				isActive={value === "grid"}
				onClick={() => onChange("grid")}
				aria-label="グリッド表示"
				size="md"
				className="rounded-xl"
			>
				<LayoutGrid className="size-5" />
			</FilterButton>
			<FilterButton
				isActive={value === "list"}
				onClick={() => onChange("list")}
				aria-label="リスト表示"
				size="md"
				className="rounded-xl"
			>
				<List className="size-5" />
			</FilterButton>
		</div>
	);
}
