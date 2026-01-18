import {
	Calendar,
	Disc3,
	Hash,
	Music,
	Search,
	UserCheck,
	UserRound,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterChip, FilterChipType } from "./types";
import { CHIP_COLORS } from "./types";

interface FilterChipsProps {
	/** 表示するチップのリスト */
	chips: FilterChip[];
	/** チップの削除ハンドラ */
	onRemove: (chip: FilterChip) => void;
	/** すべてクリアハンドラ */
	onClearAll: () => void;
	/** カスタムクラス名 */
	className?: string;
}

/** フィルタータイプに対応するアイコン */
const CHIP_ICONS: Record<FilterChipType, React.ElementType> = {
	textSearch: Search,
	originalSong: Music,
	artist: UserRound,
	circle: Disc3,
	roleCount: UserCheck,
	songCount: Hash,
	date: Calendar,
	event: Calendar,
};

/** フィルタータイプに対応するラベルプレフィックス */
const CHIP_PREFIXES: Record<FilterChipType, string> = {
	textSearch: "",
	originalSong: "原曲",
	artist: "",
	circle: "サークル",
	roleCount: "",
	songCount: "原曲数",
	date: "期間",
	event: "イベント",
};

/**
 * 選択中のフィルターをチップとして表示するコンポーネント
 *
 * - 各チップは削除可能（×ボタン）
 * - 色分けでフィルタータイプを視覚的に区別
 * - 「すべてクリア」ボタンで一括削除
 * - 横スクロール対応（モバイル）
 */
export function FilterChips({
	chips,
	onRemove,
	onClearAll,
	className,
}: FilterChipsProps) {
	if (chips.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-200/30 p-3",
				className,
			)}
		>
			<span className="mr-1 text-base-content/60 text-sm">選択中:</span>

			{/* チップリスト */}
			<div className="flex flex-wrap gap-2">
				{chips.map((chip) => {
					const Icon = CHIP_ICONS[chip.type];
					const prefix = CHIP_PREFIXES[chip.type];
					const colorClass = CHIP_COLORS[chip.type];

					return (
						<div
							key={chip.id}
							className={cn(
								"badge cursor-default gap-1 pr-1",
								colorClass,
								"transition-all duration-200",
								"hover:shadow-sm hover:brightness-95",
								"motion-reduce:transition-none",
							)}
						>
							<Icon className="h-3 w-3" />
							<span>
								{prefix && `${prefix}: `}
								{chip.label}
								{chip.sublabel && (
									<span className="text-xs opacity-70"> ({chip.sublabel})</span>
								)}
							</span>
							<button
								type="button"
								onClick={() => onRemove(chip)}
								className={cn(
									"ml-1 cursor-pointer rounded-full p-0.5",
									"transition-colors duration-150",
									"hover:bg-base-content/30 active:bg-base-content/40",
									"focus:outline-none focus-visible:ring-1 focus-visible:ring-base-content/50",
								)}
								aria-label={`${chip.label}を削除`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					);
				})}
			</div>

			{/* すべてクリアボタン */}
			{chips.length > 1 && (
				<button
					type="button"
					onClick={onClearAll}
					className={cn(
						"ml-auto cursor-pointer rounded px-2 py-1",
						"text-base-content/60 text-xs",
						"transition-colors duration-150",
						"hover:bg-base-300 hover:text-base-content",
						"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
					)}
				>
					すべてクリア
				</button>
			)}
		</div>
	);
}

/**
 * FilterChip オブジェクトを生成するヘルパー関数
 */
export function createFilterChip(
	type: FilterChipType,
	id: string,
	label: string,
	value: string | number,
	sublabel?: string,
): FilterChip {
	return {
		id: `${type}-${id}`,
		type,
		label,
		sublabel,
		value,
	};
}
