import { cn } from "@/lib/utils";
import type {
	RoleCountEntry,
	RoleCountFilters,
	RoleCountMatchType,
	RoleCountValue,
} from "./types";

interface RoleCountFilterProps {
	/** 役割者数フィルター */
	value: RoleCountFilters;
	/** 変更ハンドラ */
	onChange: (value: RoleCountFilters) => void;
	/** カスタムクラス名 */
	className?: string;
}

interface CountSelectorProps {
	label: string;
	value: RoleCountValue;
	onChange: (value: RoleCountValue) => void;
}

function CountSelector({ label, value, onChange }: CountSelectorProps) {
	const isAny = value === "any";
	const entry: RoleCountEntry | null = value !== "any" ? value : null;
	const numericValue = entry?.count ?? "";
	const matchType = entry?.matchType ?? "gte";

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		if (inputValue === "") {
			onChange("any");
		} else {
			const num = Number.parseInt(inputValue, 10);
			if (!Number.isNaN(num) && num >= 0) {
				onChange({ count: num, matchType });
			}
		}
	};

	const handleMatchTypeChange = (newMatchType: RoleCountMatchType) => {
		if (entry) {
			onChange({ count: entry.count, matchType: newMatchType });
		}
	};

	return (
		<div className="form-control">
			<label className="label py-1">
				<span className="label-text text-sm">{label}</span>
			</label>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onChange("any")}
					className={cn("btn btn-xs", isAny ? "btn-primary" : "btn-ghost")}
				>
					すべて
				</button>
				<input
					type="number"
					min="0"
					value={numericValue}
					onChange={handleInputChange}
					placeholder="人数"
					className="input input-xs input-bordered w-16"
				/>
				<span className="text-sm">人</span>
				{entry && (
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => handleMatchTypeChange("exact")}
							className={cn(
								"btn btn-xs",
								matchType === "exact" ? "btn-secondary" : "btn-ghost",
							)}
						>
							一致
						</button>
						<button
							type="button"
							onClick={() => handleMatchTypeChange("gte")}
							className={cn(
								"btn btn-xs",
								matchType === "gte" ? "btn-secondary" : "btn-ghost",
							)}
						>
							以上
						</button>
						<button
							type="button"
							onClick={() => handleMatchTypeChange("lte")}
							className={cn(
								"btn btn-xs",
								matchType === "lte" ? "btn-secondary" : "btn-ghost",
							)}
						>
							以下
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * 役割者数フィルター
 *
 * - ボーカル数
 * - 作詞者数
 * - 作曲者数
 * - 編曲者数
 *
 * 任意の数値を入力可能
 */
export function RoleCountFilter({
	value,
	onChange,
	className,
}: RoleCountFilterProps) {
	const handleChange = (
		field: keyof RoleCountFilters,
		newValue: RoleCountValue,
	) => {
		onChange({ ...value, [field]: newValue });
	};

	return (
		<div className={cn("space-y-3", className)}>
			<CountSelector
				label="ボーカル数"
				value={value.vocalistCount}
				onChange={(v) => handleChange("vocalistCount", v)}
			/>
			<CountSelector
				label="作詞者数"
				value={value.lyricistCount}
				onChange={(v) => handleChange("lyricistCount", v)}
			/>
			<CountSelector
				label="作曲者数"
				value={value.composerCount}
				onChange={(v) => handleChange("composerCount", v)}
			/>
			<CountSelector
				label="編曲者数"
				value={value.arrangerCount}
				onChange={(v) => handleChange("arrangerCount", v)}
			/>
		</div>
	);
}
