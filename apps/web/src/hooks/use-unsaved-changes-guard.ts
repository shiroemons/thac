import { useBlocker } from "@tanstack/react-router";
import { useCallback, useState } from "react";

/**
 * 未保存変更がある場合にナビゲーション（ルート遷移）とダイアログ閉じるを保護するカスタムフック
 *
 * @param onOpenChange - ダイアログの開閉状態を変更する関数
 * @param options - 保護オプション
 * @returns 保護状態と操作関数
 */
export interface UseUnsavedChangesGuardOptions {
	/** 変更があるかどうか */
	isDirty: boolean;
	/** ダイアログが開いているか */
	isOpen: boolean;
	/** 確認なしで閉じることを許可するフラグ（保存成功後など） */
	allowClose?: boolean;
}

export interface UseUnsavedChangesGuardReturn {
	/** 閉じる確認ダイアログの開閉状態 */
	showConfirmDialog: boolean;
	/** 閉じる確認ダイアログを閉じる */
	closeConfirmDialog: () => void;
	/** 閉じる確認ダイアログで「破棄」を選択 */
	confirmDiscard: () => void;
	/** Dialog の onOpenChange をラップしたハンドラ */
	guardedOnOpenChange: (open: boolean) => void;
}

export function useUnsavedChangesGuard(
	onOpenChange: (open: boolean) => void,
	options: UseUnsavedChangesGuardOptions,
): UseUnsavedChangesGuardReturn {
	const { isDirty, isOpen, allowClose = false } = options;
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	// ルート遷移をブロック
	useBlocker({
		shouldBlockFn: () => {
			if (!isOpen || !isDirty || allowClose) {
				return false;
			}
			const shouldLeave = window.confirm(
				"変更が保存されていません。このページを離れますか？",
			);
			return !shouldLeave;
		},
	});

	/** 閉じる確認ダイアログを閉じる（キャンセル） */
	const closeConfirmDialog = useCallback(() => {
		setShowConfirmDialog(false);
	}, []);

	/** 破棄を確定してダイアログを閉じる */
	const confirmDiscard = useCallback(() => {
		setShowConfirmDialog(false);
		onOpenChange(false);
	}, [onOpenChange]);

	/** Dialog の onOpenChange をラップしたハンドラ */
	const guardedOnOpenChange = useCallback(
		(open: boolean) => {
			// 開く操作はそのまま通す
			if (open) {
				onOpenChange(true);
				return;
			}

			// 閉じる操作
			// allowCloseが有効または変更がない場合はそのまま閉じる
			if (allowClose || !isDirty) {
				onOpenChange(false);
				return;
			}

			// 変更がある場合は確認ダイアログを表示
			setShowConfirmDialog(true);
		},
		[onOpenChange, allowClose, isDirty],
	);

	return {
		showConfirmDialog,
		closeConfirmDialog,
		confirmDiscard,
		guardedOnOpenChange,
	};
}
