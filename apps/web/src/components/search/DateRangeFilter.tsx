import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "./types";

interface DateRangeFilterProps {
	/** 選択中の日付範囲 */
	dateRange: DateRange;
	/** 日付範囲変更ハンドラ */
	onChange: (dateRange: DateRange) => void;
	/** カスタムクラス名 */
	className?: string;
}

/** クイックプリセット */
const PRESETS = [
	{ label: "2024年", from: "2024-01", to: "2024-12" },
	{ label: "2023年", from: "2023-01", to: "2023-12" },
	{ label: "2020年代", from: "2020-01", to: "2029-12" },
	{ label: "2010年代", from: "2010-01", to: "2019-12" },
] as const;

/**
 * リリース日範囲選択フィルター
 *
 * - 開始日・終了日の入力
 * - クイックプリセット（2024年、2023年、2020年代など）
 * - YYYY-MM形式
 */
export function DateRangeFilter({
	dateRange,
	onChange,
	className,
}: DateRangeFilterProps) {
	const handleFromChange = (value: string) => {
		onChange({ ...dateRange, from: value || undefined });
	};

	const handleToChange = (value: string) => {
		onChange({ ...dateRange, to: value || undefined });
	};

	const handlePreset = (from: string, to: string) => {
		onChange({ from, to });
	};

	const handleClear = () => {
		onChange({});
	};

	const hasValue = dateRange.from || dateRange.to;

	return (
		<div className={cn("space-y-3", className)}>
			{/* 日付入力 */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-base-content/50" />
					<span className="text-sm">開始:</span>
					<input
						type="month"
						value={dateRange.from || ""}
						onChange={(e) => handleFromChange(e.target.value)}
						className="input input-sm input-bordered w-36"
						placeholder="YYYY-MM"
					/>
				</div>

				<span className="text-base-content/50">〜</span>

				<div className="flex items-center gap-2">
					<span className="text-sm">終了:</span>
					<input
						type="month"
						value={dateRange.to || ""}
						onChange={(e) => handleToChange(e.target.value)}
						className="input input-sm input-bordered w-36"
						placeholder="YYYY-MM"
					/>
				</div>

				{hasValue && (
					<button
						type="button"
						onClick={handleClear}
						className="btn btn-ghost btn-sm text-base-content/60"
					>
						クリア
					</button>
				)}
			</div>

			{/* クイックプリセット */}
			<div className="flex flex-wrap gap-2">
				<span className="text-base-content/60 text-sm">プリセット:</span>
				{PRESETS.map((preset) => {
					const isActive =
						dateRange.from === preset.from && dateRange.to === preset.to;
					return (
						<button
							key={preset.label}
							type="button"
							onClick={() => handlePreset(preset.from, preset.to)}
							className={cn("btn btn-xs", isActive ? "btn-info" : "btn-ghost")}
						>
							{preset.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
