import {
	ALPHABET_INITIALS,
	type AlphabetInitial,
	KANA_ROW_LABELS,
	KANA_ROWS,
	type KanaRow,
	SCRIPT_CATEGORIES,
	SCRIPT_CATEGORY_LABELS,
	type ScriptCategory,
} from "@/lib/script-filter-utils";

// Re-export types for convenience
export type { AlphabetInitial, KanaRow, ScriptCategory };

// =============================================================================
// ScriptFilter: 1段目の文字種選択
// =============================================================================

interface ScriptFilterProps {
	value: ScriptCategory;
	onChange: (category: ScriptCategory) => void;
}

export function ScriptFilter({ value, onChange }: ScriptFilterProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{SCRIPT_CATEGORIES.map((category) => (
				<button
					key={category}
					type="button"
					className={`btn btn-sm ${value === category ? "btn-primary" : "btn-ghost"}`}
					onClick={() => onChange(category)}
					aria-pressed={value === category}
				>
					{SCRIPT_CATEGORY_LABELS[category]}
				</button>
			))}
		</div>
	);
}

// =============================================================================
// AlphabetSubFilter: 2段目の英字選択（A-Z）
// =============================================================================

interface AlphabetSubFilterProps {
	value: AlphabetInitial | null;
	onChange: (initial: AlphabetInitial | null) => void;
}

export function AlphabetSubFilter({ value, onChange }: AlphabetSubFilterProps) {
	return (
		<div className="mt-3 rounded-lg bg-base-200 p-3">
			<p className="mb-2 text-base-content/70 text-sm">頭文字を選択</p>
			<div className="flex flex-wrap gap-1">
				<button
					type="button"
					className={`btn btn-xs ${value === null ? "btn-secondary" : "btn-ghost"}`}
					onClick={() => onChange(null)}
					aria-pressed={value === null}
				>
					すべて
				</button>
				{ALPHABET_INITIALS.map((initial) => (
					<button
						key={initial}
						type="button"
						className={`btn btn-xs min-w-8 ${value === initial ? "btn-secondary" : "btn-ghost"}`}
						onClick={() => onChange(initial)}
						aria-pressed={value === initial}
					>
						{initial}
					</button>
				))}
			</div>
		</div>
	);
}

// =============================================================================
// KanaSubFilter: 2段目のかな行選択（あ行〜わ行）
// =============================================================================

interface KanaSubFilterProps {
	value: KanaRow | null;
	onChange: (row: KanaRow | null) => void;
}

export function KanaSubFilter({ value, onChange }: KanaSubFilterProps) {
	return (
		<div className="mt-3 rounded-lg bg-base-200 p-3">
			<p className="mb-2 text-base-content/70 text-sm">行を選択</p>
			<div className="flex flex-wrap gap-1">
				<button
					type="button"
					className={`btn btn-xs ${value === null ? "btn-secondary" : "btn-ghost"}`}
					onClick={() => onChange(null)}
					aria-pressed={value === null}
				>
					すべて
				</button>
				{KANA_ROWS.map((row) => (
					<button
						key={row}
						type="button"
						className={`btn btn-xs ${value === row ? "btn-secondary" : "btn-ghost"}`}
						onClick={() => onChange(row)}
						aria-pressed={value === row}
					>
						{KANA_ROW_LABELS[row]}
					</button>
				))}
			</div>
		</div>
	);
}

// =============================================================================
// TwoStageScriptFilter: 2段階選択を統合したコンポーネント
// =============================================================================

interface TwoStageScriptFilterProps {
	scriptCategory: ScriptCategory;
	alphabetInitial: AlphabetInitial | null;
	kanaRow: KanaRow | null;
	onScriptCategoryChange: (category: ScriptCategory) => void;
	onAlphabetInitialChange: (initial: AlphabetInitial | null) => void;
	onKanaRowChange: (row: KanaRow | null) => void;
}

export function TwoStageScriptFilter({
	scriptCategory,
	alphabetInitial,
	kanaRow,
	onScriptCategoryChange,
	onAlphabetInitialChange,
	onKanaRowChange,
}: TwoStageScriptFilterProps) {
	return (
		<div>
			<ScriptFilter value={scriptCategory} onChange={onScriptCategoryChange} />

			{scriptCategory === "alphabet" && (
				<AlphabetSubFilter
					value={alphabetInitial}
					onChange={onAlphabetInitialChange}
				/>
			)}

			{scriptCategory === "kana" && (
				<KanaSubFilter value={kanaRow} onChange={onKanaRowChange} />
			)}
		</div>
	);
}
