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
import { FilterBar } from "./filter-bar";
import { FilterButton } from "./filter-button";

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
		<FilterBar aria-label="文字種選択">
			{SCRIPT_CATEGORIES.map((category) => (
				<FilterButton
					key={category}
					isActive={value === category}
					onClick={() => onChange(category)}
					size="sm"
				>
					{SCRIPT_CATEGORY_LABELS[category]}
				</FilterButton>
			))}
		</FilterBar>
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
		<div className="fade-in slide-in-from-top-2 mt-3 animate-in duration-300">
			<div className="glass-card-light rounded-2xl p-3">
				<p className="mb-2 text-base-content/70 text-sm">頭文字を選択</p>
				<div className="flex flex-wrap gap-1">
					<FilterButton
						isActive={value === null}
						onClick={() => onChange(null)}
						size="sm"
					>
						すべて
					</FilterButton>
					{ALPHABET_INITIALS.map((initial) => (
						<FilterButton
							key={initial}
							isActive={value === initial}
							onClick={() => onChange(initial)}
							size="sm"
							className="min-w-9"
						>
							{initial}
						</FilterButton>
					))}
				</div>
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
		<div className="fade-in slide-in-from-top-2 mt-3 animate-in duration-300">
			<div className="glass-card-light rounded-2xl p-3">
				<p className="mb-2 text-base-content/70 text-sm">行を選択</p>
				<div className="flex flex-wrap gap-1">
					<FilterButton
						isActive={value === null}
						onClick={() => onChange(null)}
						size="sm"
					>
						すべて
					</FilterButton>
					{KANA_ROWS.map((row) => (
						<FilterButton
							key={row}
							isActive={value === row}
							onClick={() => onChange(row)}
							size="sm"
						>
							{KANA_ROW_LABELS[row]}
						</FilterButton>
					))}
				</div>
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
