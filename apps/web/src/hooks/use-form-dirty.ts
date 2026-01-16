import { useCallback, useRef, useState } from "react";

/**
 * フォームの初期値と現在値を比較してisDirtyを計算するカスタムフック
 *
 * @template T フォームデータの型
 * @returns フォームの変更状態と操作関数
 */
export interface UseFormDirtyReturn<T> {
	/** 初期状態を設定 */
	setInitialState: (state: T) => void;
	/** 現在の状態をチェックしてisDirtyを更新 */
	checkDirty: (currentState: T) => boolean;
	/** 変更があるか */
	isDirty: boolean;
	/** リセット */
	reset: () => void;
}

/**
 * 値を正規化する（nullと空文字を同等として扱う）
 */
function normalizeValue(value: unknown): unknown {
	if (value === "" || value === null) {
		return null;
	}
	return value;
}

/**
 * オブジェクトの各値を正規化する
 */
function normalizeState<T extends Record<string, unknown>>(state: T): T {
	const normalized = {} as Record<string, unknown>;
	for (const key of Object.keys(state)) {
		normalized[key] = normalizeValue(state[key]);
	}
	return normalized as T;
}

export function useFormDirty<
	T extends Record<string, unknown>,
>(): UseFormDirtyReturn<T> {
	const initialStateRef = useRef<T | null>(null);
	const [isDirty, setIsDirty] = useState(false);

	const setInitialState = useCallback((state: T) => {
		initialStateRef.current = state;
		setIsDirty(false);
	}, []);

	const checkDirty = useCallback((currentState: T): boolean => {
		if (initialStateRef.current === null) {
			return false;
		}

		const normalizedInitial = normalizeState(initialStateRef.current);
		const normalizedCurrent = normalizeState(currentState);

		const dirty =
			JSON.stringify(normalizedInitial) !== JSON.stringify(normalizedCurrent);
		setIsDirty(dirty);
		return dirty;
	}, []);

	const reset = useCallback(() => {
		setIsDirty(false);
	}, []);

	return {
		setInitialState,
		checkDirty,
		isDirty,
		reset,
	};
}
