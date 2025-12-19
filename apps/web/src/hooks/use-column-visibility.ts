import { useCallback, useEffect, useState } from "react";

export interface ColumnConfig {
	key: string;
	label: string;
	defaultVisible?: boolean; // デフォルトtrue、falseでデフォルト非表示
}

export interface UseColumnVisibilityReturn {
	visibleColumns: Set<string>;
	toggleColumn: (key: string) => void;
	isVisible: (key: string) => boolean;
	columnConfigs: ColumnConfig[];
}

function getStorageKey(key: string): string {
	return `column-visibility:${key}`;
}

function loadVisibility(
	storageKey: string,
	columns: ColumnConfig[],
): Set<string> {
	if (typeof window === "undefined") {
		// SSR時はデフォルト値を返す
		return new Set(
			columns
				.filter((col) => col.defaultVisible !== false)
				.map((col) => col.key),
		);
	}

	try {
		const stored = localStorage.getItem(getStorageKey(storageKey));
		if (stored) {
			const parsed = JSON.parse(stored) as string[];
			return new Set(parsed);
		}
	} catch {
		// パースエラー時はデフォルト値を使用
	}

	// デフォルト値: defaultVisible !== false のカラムを表示
	return new Set(
		columns.filter((col) => col.defaultVisible !== false).map((col) => col.key),
	);
}

function saveVisibility(storageKey: string, visibleColumns: Set<string>): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(
			getStorageKey(storageKey),
			JSON.stringify([...visibleColumns]),
		);
	} catch {
		// ストレージエラーは無視
	}
}

export function useColumnVisibility(
	storageKey: string,
	columns: ColumnConfig[],
): UseColumnVisibilityReturn {
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() =>
		loadVisibility(storageKey, columns),
	);

	// マウント時にlocalStorageから読み込み（SSR対応）
	useEffect(() => {
		setVisibleColumns(loadVisibility(storageKey, columns));
	}, [storageKey, columns]);

	// 変更時に保存
	useEffect(() => {
		saveVisibility(storageKey, visibleColumns);
	}, [storageKey, visibleColumns]);

	const toggleColumn = useCallback((key: string) => {
		setVisibleColumns((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}, []);

	const isVisible = useCallback(
		(key: string) => visibleColumns.has(key),
		[visibleColumns],
	);

	return {
		visibleColumns,
		toggleColumn,
		isVisible,
		columnConfigs: columns,
	};
}
