import { LayoutGrid, List } from "lucide-react";
import { Button } from "../ui/button";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
	value: ViewMode;
	onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
	return (
		<div className="flex gap-1 rounded-lg bg-base-200 p-1">
			<Button
				size="sm"
				variant={value === "grid" ? "primary" : "ghost"}
				onClick={() => onChange("grid")}
				aria-label="グリッド表示"
				aria-pressed={value === "grid"}
			>
				<LayoutGrid className="size-4" />
			</Button>
			<Button
				size="sm"
				variant={value === "list" ? "primary" : "ghost"}
				onClick={() => onChange("list")}
				aria-label="リスト表示"
				aria-pressed={value === "list"}
			>
				<List className="size-4" />
			</Button>
		</div>
	);
}
