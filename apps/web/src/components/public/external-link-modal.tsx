import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface ExternalLinkModalProps {
	url: string | null;
	isOpen: boolean;
	onClose: () => void;
}

/**
 * 外部リンク警告モーダル
 */
export function ExternalLinkModal({
	url,
	isOpen,
	onClose,
}: ExternalLinkModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	// ドメイン抽出
	const domain = useMemo(() => {
		if (!url) return "";
		try {
			return new URL(url).hostname;
		} catch {
			return "";
		}
	}, [url]);

	// showModal()/close() による開閉制御
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen && url) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [isOpen, url]);

	// dialog の close イベントで親の状態を同期
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	// 外部サイトを開く
	const handleContinue = useCallback(() => {
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
			onClose();
		}
	}, [url, onClose]);

	// 背景クリックで閉じる
	const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
		if (e.target === dialogRef.current) {
			onClose();
		}
	};

	return (
		<dialog ref={dialogRef} className="modal" onClick={handleBackdropClick}>
			<div className="modal-box max-w-lg">
				{/* ヘッダー */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-warning">
						<AlertTriangle className="size-6" />
						<h3 className="font-bold text-lg">外部サイトに移動します</h3>
					</div>
					<button
						type="button"
						className="btn btn-circle btn-ghost btn-sm"
						onClick={onClose}
						aria-label="閉じる"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* 説明 */}
				<p className="py-4">
					以下の外部サイトに移動しようとしています。
					<br />
					リンク先の内容については責任を負いかねます。
				</p>

				{/* URL表示 */}
				<div className="rounded-lg bg-base-200 p-4">
					<p className="text-base-content/70 text-sm">移動先</p>
					<p className="break-all font-mono text-sm">{domain}</p>
					<p className="mt-2 break-all font-mono text-base-content/60 text-xs">
						{url}
					</p>
				</div>

				{/* アクション */}
				<div className="modal-action">
					<button type="button" className="btn btn-ghost" onClick={onClose}>
						キャンセル
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleContinue}
					>
						<ExternalLink className="size-4" />
						外部サイトを開く
					</button>
				</div>
			</div>
			{/* 背景クリックで閉じる */}
			<form method="dialog" className="modal-backdrop">
				<button type="submit">閉じる</button>
			</form>
		</dialog>
	);
}
