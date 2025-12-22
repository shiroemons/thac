import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortIconProps {
	column: string;
	sortBy: string;
	sortOrder: "asc" | "desc";
}

export function SortIcon({ column, sortBy, sortOrder }: SortIconProps) {
	if (sortBy !== column) {
		return <ArrowUpDown className="ml-1 inline h-4 w-4 text-base-content/30" />;
	}
	return sortOrder === "asc" ? (
		<ArrowUp className="ml-1 inline h-4 w-4" />
	) : (
		<ArrowDown className="ml-1 inline h-4 w-4" />
	);
}
