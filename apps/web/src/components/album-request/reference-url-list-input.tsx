import { Plus, X } from "lucide-react";

const MAX_URLS = 10;

interface ReferenceUrl {
	url: string;
	label?: string;
}

interface ReferenceUrlListInputProps {
	value: ReferenceUrl[];
	onChange: (value: ReferenceUrl[]) => void;
	error?: string;
}

export function ReferenceUrlListInput({
	value,
	onChange,
	error,
}: ReferenceUrlListInputProps) {
	const items = value.length === 0 ? [{ url: "", label: "" }] : value;

	const handleUrlChange = (index: number, url: string) => {
		const updated = items.map((item, i) =>
			i === index ? { ...item, url } : item,
		);
		onChange(updated);
	};

	const handleLabelChange = (index: number, label: string) => {
		const updated = items.map((item, i) =>
			i === index ? { ...item, label } : item,
		);
		onChange(updated);
	};

	const handleAdd = () => {
		if (items.length >= MAX_URLS) return;
		onChange([...items, { url: "", label: "" }]);
	};

	const handleRemove = (index: number) => {
		if (items.length <= 1) return;
		onChange(items.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			{items.map((item, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: index is stable for this input list
				<div key={index} className="flex gap-2">
					<div className="flex-1 space-y-1">
						<input
							type="url"
							value={item.url}
							onChange={(e) => handleUrlChange(index, e.target.value)}
							placeholder="https://example.com/album"
							className="input w-full"
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
						<input
							type="text"
							value={item.label ?? ""}
							onChange={(e) => handleLabelChange(index, e.target.value)}
							placeholder="ラベル（公式サイト / Bandcamp 等、任意）"
							className="input input-sm w-full"
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
					</div>
					<button
						type="button"
						onClick={() => handleRemove(index)}
						disabled={items.length <= 1}
						className="btn btn-ghost btn-sm btn-square self-start"
						aria-label="この参考URLを削除"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			))}

			{error && <p className="text-error text-sm">{error}</p>}

			{items.length < MAX_URLS && (
				<button
					type="button"
					onClick={handleAdd}
					className="btn btn-ghost btn-sm gap-1"
				>
					<Plus className="h-4 w-4" />
					参考URLを追加
				</button>
			)}
			<p className="text-base-content/50 text-xs">
				{items.length} / {MAX_URLS} 件
			</p>
		</div>
	);
}
