import { useCallback, useState } from "react";

interface UseSortableTableOptions {
	defaultSortBy?: string;
	defaultSortOrder?: "asc" | "desc";
	onSortChange?: () => void;
	/** 3段階ソート（昇順→降順→リセット）を有効にする（デフォルト: true） */
	threeStateSort?: boolean;
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
		threeStateSort = true,
	} = options;

	const [sortBy, setSortBy] = useState<string>(defaultSortBy);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

	const handleSort = useCallback(
		(column: string) => {
			if (sortBy === column) {
				if (sortOrder === "asc") {
					// 昇順 → 降順
					setSortOrder("desc");
				} else if (threeStateSort) {
					// 3段階モード: 降順 → リセット（デフォルトに戻す）
					setSortBy(defaultSortBy);
					setSortOrder(defaultSortOrder);
				} else {
					// 2段階モード: 降順 → 昇順
					setSortOrder("asc");
				}
			} else {
				setSortBy(column);
				setSortOrder("asc");
			}
			onSortChange?.();
		},
		[
			sortBy,
			sortOrder,
			threeStateSort,
			defaultSortBy,
			defaultSortOrder,
			onSortChange,
		],
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
