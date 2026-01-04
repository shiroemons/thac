import { Hash } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SongCountFilter } from "./types";

interface OriginalSongCountFilterProps {
	/** 選択中の原曲数フィルター */
	value: SongCountFilter;
	/** 値変更ハンドラ */
	onChange: (value: SongCountFilter) => void;
	/** カスタムクラス名 */
	className?: string;
}

/** プリセットボタンの値 */
const PRESET_VALUES: { label: string; value: SongCountFilter }[] = [
	{ label: "すべて", value: "any" },
	{ label: "1曲", value: "1" },
	{ label: "2曲", value: "2" },
	{ label: "3曲以上", value: "3+" },
];

/**
 * 原曲数フィルター
 *
 * - プリセットボタン（すべて、1曲、2曲、3曲以上）
 * - カスタム入力（○曲以上）
 */
export function OriginalSongCountFilter({
	value,
	onChange,
	className,
}: OriginalSongCountFilterProps) {
	const [customValue, setCustomValue] = useState<string>("");

	const handlePresetClick = (presetValue: SongCountFilter) => {
		onChange(presetValue);
		setCustomValue("");
	};

	const handleCustomChange = (inputValue: string) => {
		setCustomValue(inputValue);
		const num = Number.parseInt(inputValue, 10);
		if (!Number.isNaN(num) && num > 0) {
			onChange(num);
		} else if (inputValue === "") {
			onChange("any");
		}
	};

	const isCustom = typeof value === "number" && value > 3;

	return (
		<div className={cn("space-y-3", className)}>
			{/* プリセットボタン */}
			<div className="flex flex-wrap items-center gap-2">
				<Hash className="h-4 w-4 text-base-content/50" />
				<div className="flex gap-1">
					{PRESET_VALUES.map((preset) => {
						const isActive = value === preset.value;
						return (
							<button
								key={preset.label}
								type="button"
								onClick={() => handlePresetClick(preset.value)}
								className={cn(
									"btn btn-sm",
									isActive && !isCustom ? "btn-primary" : "btn-ghost",
								)}
							>
								{preset.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* カスタム入力 */}
			<div className="flex items-center gap-2">
				<span className="text-base-content/60 text-sm">または</span>
				<input
					type="number"
					min="1"
					max="99"
					value={customValue || (isCustom ? String(value) : "")}
					onChange={(e) => handleCustomChange(e.target.value)}
					placeholder="4"
					className={cn(
						"input input-sm input-bordered w-16",
						isCustom && "input-primary",
					)}
				/>
				<span className="text-sm">曲以上</span>
			</div>
		</div>
	);
}
