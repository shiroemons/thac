import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useCallback, useMemo } from "react";

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
	// ドメイン抽出
	const domain = useMemo(() => {
		if (!url) return "";
		try {
			return new URL(url).hostname;
		} catch {
			return "";
		}
	}, [url]);

	// 外部サイトを開く
	const handleContinue = useCallback(() => {
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
			onClose();
		}
	}, [url, onClose]);

	if (!isOpen || !url) return null;

	return (
		<dialog className="modal modal-open">
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
					<p className="mt-2 break-all font-mono text-base-content/50 text-xs">
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
				<button type="button" onClick={onClose}>
					close
				</button>
			</form>
		</dialog>
	);
}
