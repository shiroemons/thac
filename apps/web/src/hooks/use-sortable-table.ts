import { useCallback, useState } from "react";

interface UseSortableTableOptions {
	defaultSortBy?: string;
	defaultSortOrder?: "asc" | "desc";
	onSortChange?: () => void;
}

interface UseSortableTableReturn {
	sortBy: string;
	sortOrder: "asc" | "desc";
	handleSort: (column: string) => void;
	resetSort: () => void;
	setSortBy: (column: string) => void;
	setSortOrder: (order: "asc" | "desc") => void;
}

export function useSortableTable(
	options: UseSortableTableOptions = {},
): UseSortableTableReturn {
	const {
		defaultSortBy = "sortOrder",
		defaultSortOrder = "asc",
		onSortChange,
	} = options;

	const [sortBy, setSortBy] = useState<string>(defaultSortBy);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

	const handleSort = useCallback(
		(column: string) => {
			if (sortBy === column) {
				setSortOrder(sortOrder === "asc" ? "desc" : "asc");
			} else {
				setSortBy(column);
				setSortOrder("asc");
			}
			onSortChange?.();
		},
		[sortBy, sortOrder, onSortChange],
	);

	const resetSort = useCallback(() => {
		setSortBy(defaultSortBy);
		setSortOrder(defaultSortOrder);
		onSortChange?.();
	}, [defaultSortBy, defaultSortOrder, onSortChange]);

	return {
		sortBy,
		sortOrder,
		handleSort,
		resetSort,
		setSortBy,
		setSortOrder,
	};
}
