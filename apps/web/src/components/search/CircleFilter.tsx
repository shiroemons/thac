import { Check, Disc3, Plus, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { MockCircle } from "./mock-data";
import type { SelectedCircle } from "./types";

interface CircleFilterProps {
	/** 選択中のサークルリスト */
	selectedCircles: SelectedCircle[];
	/** 選択変更ハンドラ */
	onChange: (circles: SelectedCircle[]) => void;
	/** 選択可能なサークルオプション */
	options: MockCircle[];
	/** カスタムクラス名 */
	className?: string;
}

/**
 * サークル選択フィルター（複数選択対応）
 *
 * - 検索可能なドロップダウン
 * - チェックボックスで複数選択
 * - 選択中のサークルをチップで表示
 */
export function CircleFilter({
	selectedCircles,
	onChange,
	options,
	className,
}: CircleFilterProps) {
	const [search, setSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// 選択中のIDセット
	const selectedIds = useMemo(
		() => new Set(selectedCircles.map((c) => c.id)),
		[selectedCircles],
	);

	// 検索でフィルタリング
	const filteredOptions = useMemo(() => {
		if (!search) return options;
		const lowerSearch = search.toLowerCase();
		return options.filter(
			(o) =>
				o.name.toLowerCase().includes(lowerSearch) ||
				o.nameJa?.toLowerCase().includes(lowerSearch),
		);
	}, [options, search]);

	// サークルを選択/解除
	const toggleCircle = useCallback(
		(circle: MockCircle) => {
			if (selectedIds.has(circle.id)) {
				onChange(selectedCircles.filter((c) => c.id !== circle.id));
			} else {
				onChange([...selectedCircles, { id: circle.id, name: circle.name }]);
			}
		},
		[selectedIds, selectedCircles, onChange],
	);

	// 選択中のサークルを削除
	const removeCircle = useCallback(
		(id: string) => {
			onChange(selectedCircles.filter((c) => c.id !== id));
		},
		[selectedCircles, onChange],
	);

	return (
		<div className={cn("space-y-3", className)}>
			{/* 選択中のサークルチップ */}
			{selectedCircles.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedCircles.map((circle) => (
						<div
							key={circle.id}
							className="badge badge-secondary gap-1 pr-1 transition-all hover:opacity-80"
						>
							<Disc3 className="h-3 w-3" />
							<span className="max-w-[120px] truncate">{circle.name}</span>
							<button
								type="button"
								onClick={() => removeCircle(circle.id)}
								className="ml-1 rounded-full p-0.5 transition-colors hover:bg-base-content/20"
								aria-label={`${circle.name}を削除`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* サークル追加ボタン/ドロップダウン */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					className="btn btn-outline btn-sm gap-2"
				>
					<Plus className="h-4 w-4" />
					サークルを追加
				</button>

				{/* ドロップダウンパネル */}
				{isDropdownOpen && (
					<div className="absolute top-full left-0 z-50 mt-2 w-full max-w-md rounded-lg border border-base-300 bg-base-100 shadow-lg">
						{/* ヘッダー */}
						<div className="flex items-center justify-between border-base-300 border-b p-2">
							<span className="font-medium text-sm">サークルを選択</span>
							<button
								type="button"
								onClick={() => {
									setIsDropdownOpen(false);
									setSearch("");
								}}
								className="btn btn-ghost btn-xs btn-circle"
								aria-label="閉じる"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{/* 検索欄 */}
						<div className="border-base-300 border-b p-2">
							<div className="relative">
								<Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-base-content/50" />
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="サークルを検索..."
									className="input input-sm input-bordered w-full pl-9"
								/>
							</div>
						</div>

						{/* オプションリスト */}
						<div className="max-h-72 overflow-y-auto">
							{filteredOptions.length === 0 ? (
								<div className="p-4 text-center text-base-content/50">
									該当するサークルがありません
								</div>
							) : (
								filteredOptions.map((circle) => {
									const isSelected = selectedIds.has(circle.id);
									return (
										<button
											key={circle.id}
											type="button"
											onClick={() => toggleCircle(circle)}
											className={cn(
												"flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-base-200",
												isSelected &&
													"bg-secondary/10 font-medium text-secondary",
											)}
										>
											<div
												className={cn(
													"flex h-4 w-4 shrink-0 items-center justify-center rounded border",
													isSelected
														? "border-secondary bg-secondary text-secondary-content"
														: "border-base-300",
												)}
											>
												{isSelected && <Check className="h-3 w-3" />}
											</div>
											<span>{circle.name}</span>
											{circle.nameJa && circle.nameJa !== circle.name && (
												<span className="text-base-content/50 text-sm">
													({circle.nameJa})
												</span>
											)}
										</button>
									);
								})
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
