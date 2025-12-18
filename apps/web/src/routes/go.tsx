import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/go")({
	validateSearch: (search: Record<string, unknown>) => ({
		url: (search.url as string) || "",
	}),
	component: ExternalLinkPage,
});

function ExternalLinkPage() {
	const { url } = Route.useSearch();

	// URLのバリデーション
	const isValidUrl = url?.startsWith("http");

	// ドメイン抽出
	let domain = "";
	try {
		if (isValidUrl) {
			domain = new URL(url).hostname;
		}
	} catch {
		// invalid URL
	}

	const handleContinue = () => {
		if (isValidUrl) {
			window.open(url, "_blank", "noopener,noreferrer");
		}
	};

	if (!isValidUrl) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-error">無効なURLです</p>
					<a href="/" className="link mt-4 inline-block">
						トップに戻る
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
			<div className="card w-full max-w-lg bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center gap-2 text-warning">
						<AlertTriangle className="h-6 w-6" />
						<h2 className="card-title">外部サイトに移動します</h2>
					</div>

					<p className="py-4">
						以下の外部サイトに移動しようとしています。
						<br />
						リンク先の内容については責任を負いかねます。
					</p>

					<div className="rounded-lg bg-base-200 p-4">
						<p className="text-base-content/70 text-sm">移動先</p>
						<p className="break-all font-mono text-sm">{domain}</p>
						<p className="mt-2 break-all font-mono text-base-content/50 text-xs">
							{url}
						</p>
					</div>

					<div className="card-actions mt-6 justify-between">
						<button
							type="button"
							className="btn btn-ghost"
							onClick={() => {
								// 新しいタブで開いた場合はhistory.lengthが1なので、ウィンドウを閉じる
								if (window.history.length <= 1) {
									window.close();
								} else {
									history.back();
								}
							}}
						>
							<ArrowLeft className="h-4 w-4" />
							戻る
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleContinue}
						>
							<ExternalLink className="h-4 w-4" />
							外部サイトを開く
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
