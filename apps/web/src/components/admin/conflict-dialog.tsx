import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConflictDialogProps<T> {
	/** ダイアログの開閉状態 */
	open: boolean;
	/** ダイアログの開閉状態を変更するコールバック */
	onOpenChange: (open: boolean) => void;
	/** 競合したサーバー側の最新データ */
	currentData: T | null;
	/** エンティティの表示名を取得する関数 */
	getDisplayName?: (data: T) => string;
	/** 「現在のデータで上書き」を選択した場合のコールバック */
	onOverwrite: () => void;
	/** 「編集を続ける」を選択した場合のコールバック（最新データをフォームに反映） */
	onContinueEditing: (data: T) => void;
	/** ローディング状態 */
	isLoading?: boolean;
}

/**
 * 楽観的ロック競合時に表示するダイアログコンポーネント
 *
 * ユーザーに以下の選択肢を提供:
 * 1. キャンセル - ダイアログを閉じ、変更を破棄
 * 2. 編集を続ける - 最新データをフォームに反映して編集を続行
 * 3. 上書き - 現在の編集内容でサーバーデータを上書き
 */
function ConflictDialog<T>({
	open,
	onOpenChange,
	currentData,
	getDisplayName,
	onOverwrite,
	onContinueEditing,
	isLoading = false,
}: ConflictDialogProps<T>) {
	const handleCancel = () => {
		onOpenChange(false);
	};

	const handleContinueEditing = () => {
		if (currentData) {
			onContinueEditing(currentData);
		}
		onOpenChange(false);
	};

	const handleOverwrite = () => {
		onOverwrite();
	};

	const displayName =
		currentData && getDisplayName ? getDisplayName(currentData) : "このデータ";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
							<AlertTriangle className="h-5 w-5 text-warning" />
						</div>
						<DialogTitle>編集の競合が発生しました</DialogTitle>
					</div>
				</DialogHeader>
				<DialogDescription className="space-y-2 py-2">
					<p>
						<strong>{displayName}</strong>{" "}
						は、あなたが編集を開始した後に他のユーザーによって更新されています。
					</p>
					<p>どのように対応しますか？</p>
				</DialogDescription>
				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
						キャンセル
					</Button>
					<Button
						variant="outline"
						onClick={handleContinueEditing}
						disabled={isLoading || !currentData}
					>
						最新データで編集を続ける
					</Button>
					<Button
						variant="warning"
						onClick={handleOverwrite}
						disabled={isLoading}
					>
						{isLoading ? "処理中..." : "現在の内容で上書き"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { ConflictDialog };
export type { ConflictDialogProps };
