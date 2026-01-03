export type ScriptCategory = "all" | "symbol" | "alphabet" | "kana" | "kanji";

interface ScriptFilterProps {
	value: ScriptCategory;
	onChange: (category: ScriptCategory) => void;
}

const categories: { value: ScriptCategory; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "symbol", label: "記号・数字" },
	{ value: "alphabet", label: "英字" },
	{ value: "kana", label: "かな" },
	{ value: "kanji", label: "漢字" },
];

export function ScriptFilter({ value, onChange }: ScriptFilterProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{categories.map((category) => (
				<button
					key={category.value}
					type="button"
					className={`btn btn-sm ${value === category.value ? "btn-primary" : "btn-ghost"}`}
					onClick={() => onChange(category.value)}
					aria-pressed={value === category.value}
				>
					{category.label}
				</button>
			))}
		</div>
	);
}
