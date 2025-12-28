import { useCallback, useState } from "react";

export interface SelectableItem {
	id: string;
}

export interface UseRowSelectionReturn<T extends SelectableItem> {
	selectedIds: Set<string>;
	selectedItems: Map<string, T>;
	isSelected: (id: string) => boolean;
	isAllSelected: (currentPageItems: T[]) => boolean;
	isIndeterminate: (currentPageItems: T[]) => boolean;
	toggleItem: (item: T) => void;
	toggleAll: (currentPageItems: T[]) => void;
	clearSelection: () => void;
	selectedCount: number;
}

export function useRowSelection<
	T extends SelectableItem,
>(): UseRowSelectionReturn<T> {
	// IDのSetと、選択されたアイテムの完全なデータを保持するMap
	const [selectedItems, setSelectedItems] = useState<Map<string, T>>(new Map());

	const selectedIds = new Set(selectedItems.keys());
	const selectedCount = selectedItems.size;

	const isSelected = useCallback(
		(id: string) => selectedItems.has(id),
		[selectedItems],
	);

	const isAllSelected = useCallback(
		(currentPageItems: T[]) =>
			currentPageItems.length > 0 &&
			currentPageItems.every((item) => selectedItems.has(item.id)),
		[selectedItems],
	);

	const isIndeterminate = useCallback(
		(currentPageItems: T[]) => {
			const selectedOnPage = currentPageItems.filter((item) =>
				selectedItems.has(item.id),
			).length;
			return selectedOnPage > 0 && selectedOnPage < currentPageItems.length;
		},
		[selectedItems],
	);

	const toggleItem = useCallback((item: T) => {
		setSelectedItems((prev) => {
			const next = new Map(prev);
			if (next.has(item.id)) {
				next.delete(item.id);
			} else {
				next.set(item.id, item);
			}
			return next;
		});
	}, []);

	const toggleAll = useCallback((currentPageItems: T[]) => {
		setSelectedItems((prev) => {
			const next = new Map(prev);
			const allSelected = currentPageItems.every((item) => next.has(item.id));

			if (allSelected) {
				// 全解除（現在のページのみ）
				for (const item of currentPageItems) {
					next.delete(item.id);
				}
			} else {
				// 全選択（現在のページを追加）
				for (const item of currentPageItems) {
					next.set(item.id, item);
				}
			}
			return next;
		});
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedItems(new Map());
	}, []);

	return {
		selectedIds,
		selectedItems,
		isSelected,
		isAllSelected,
		isIndeterminate,
		toggleItem,
		toggleAll,
		clearSelection,
		selectedCount,
	};
}
