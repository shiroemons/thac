import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnConfig } from "@/hooks/use-column-visibility";

interface ColumnVisibilityToggleProps {
	columns: ColumnConfig[];
	visibleColumns: Set<string>;
	onToggle: (key: string) => void;
}

function ColumnVisibilityToggle({
	columns,
	visibleColumns,
	onToggle,
}: ColumnVisibilityToggleProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="md" className="gap-1.5">
					<Settings2 className="h-4 w-4" />
					表示列
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel>表示する列</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="max-h-64 overflow-y-auto">
					{columns.map((column) => (
						<label
							key={column.key}
							className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-base-200"
						>
							<Checkbox
								checked={visibleColumns.has(column.key)}
								onCheckedChange={() => onToggle(column.key)}
							/>
							<span className="text-sm">{column.label}</span>
						</label>
					))}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export { ColumnVisibilityToggle };
export type { ColumnVisibilityToggleProps };
