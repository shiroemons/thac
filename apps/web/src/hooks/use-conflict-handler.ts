import { useCallback, useState } from "react";

/**
 * 楽観的ロック競合を処理するためのカスタムフック
 *
 * @template T 競合したエンティティの型
 * @returns 競合状態と処理関数
 */
export interface ConflictState<T> {
	/** 競合が発生しているかどうか */
	isConflict: boolean;
	/** 競合時のサーバー側の最新データ */
	conflictData: T | null;
}

export interface UseConflictHandlerReturn<T> {
	/** 現在の競合状態 */
	conflictState: ConflictState<T>;
	/** 競合を設定する */
	setConflict: (data: T) => void;
	/** 競合をクリアする */
	clearConflict: () => void;
}

export function useConflictHandler<T>(): UseConflictHandlerReturn<T> {
	const [conflictState, setConflictState] = useState<ConflictState<T>>({
		isConflict: false,
		conflictData: null,
	});

	const setConflict = useCallback((data: T) => {
		setConflictState({
			isConflict: true,
			conflictData: data,
		});
	}, []);

	const clearConflict = useCallback(() => {
		setConflictState({
			isConflict: false,
			conflictData: null,
		});
	}, []);

	return {
		conflictState,
		setConflict,
		clearConflict,
	};
}
