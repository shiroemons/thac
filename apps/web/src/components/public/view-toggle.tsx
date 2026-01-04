import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
	value: ViewMode;
	onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
	return (
		<div className="flex gap-1 rounded-lg bg-base-200 p-1">
			<button
				type="button"
				className={`btn btn-sm ${value === "grid" ? "btn-primary" : "btn-ghost"}`}
				onClick={() => onChange("grid")}
				aria-label="グリッド表示"
				aria-pressed={value === "grid"}
			>
				<LayoutGrid className="size-4" />
			</button>
			<button
				type="button"
				className={`btn btn-sm ${value === "list" ? "btn-primary" : "btn-ghost"}`}
				onClick={() => onChange("list")}
				aria-label="リスト表示"
				aria-pressed={value === "list"}
			>
				<List className="size-4" />
			</button>
		</div>
	);
}
