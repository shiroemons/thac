import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface CollectionUrlCopyProps {
	shortId: string;
}

export function CollectionUrlCopy({
	shortId,
}: CollectionUrlCopyProps): React.ReactNode {
	const { showToast } = useToast();
	const [copied, setCopied] = useState(false);

	const url =
		typeof window !== "undefined"
			? `${window.location.origin}/collections/${shortId}`
			: `/collections/${shortId}`;

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			showToast("success", "URLをコピーしました");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast("error", "コピーに失敗しました");
		}
	};

	return (
		<div className="flex items-center gap-2">
			<code className="break-all rounded-field bg-base-200 px-2 py-1 text-base-content/70 text-xs">
				{url}
			</code>
			<button
				type="button"
				onClick={handleCopy}
				className="btn btn-ghost btn-xs shrink-0"
				aria-label="URLをコピー"
				title="URLをコピー"
			>
				{copied ? (
					<Check className="size-3.5 text-success" />
				) : (
					<Copy className="size-3.5" />
				)}
			</button>
		</div>
	);
}
