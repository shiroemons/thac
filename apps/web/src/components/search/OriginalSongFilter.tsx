import { Check, Music, Plus, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { NestedOption } from "../ui/nested-grouped-searchable-select";
import type { SelectedOriginalSong } from "./types";

interface OriginalSongFilterProps {
	/** 選択中の原曲リスト */
	selectedSongs: SelectedOriginalSong[];
	/** 選択変更ハンドラ */
	onChange: (songs: SelectedOriginalSong[]) => void;
	/** 選択可能な原曲オプション */
	options: NestedOption[];
	/** カテゴリの表示順序 */
	categoryOrder?: readonly string[];
	/** カスタムクラス名 */
	className?: string;
}

interface WorkGroup {
	workName: string;
	options: NestedOption[];
}

interface CategoryGroup {
	category: string;
	works: WorkGroup[];
}

/**
 * 原曲選択フィルター（3階層構造・複数選択対応）
 *
 * - カテゴリ → 作品 → 楽曲 の3階層表示
 * - チェックボックスで複数選択可能
 * - 検索機能付き
 * - 選択中の原曲をチップで表示
 */
export function OriginalSongFilter({
	selectedSongs,
	onChange,
	options,
	categoryOrder,
	className,
}: OriginalSongFilterProps) {
	const [search, setSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// 選択中のIDセット
	const selectedIds = useMemo(
		() => new Set(selectedSongs.map((s) => s.id)),
		[selectedSongs],
	);

	// 検索でフィルタリング
	const filteredOptions = useMemo(() => {
		if (!search) return options;
		const lowerSearch = search.toLowerCase();
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(lowerSearch) ||
				o.category?.toLowerCase().includes(lowerSearch) ||
				o.subgroup?.toLowerCase().includes(lowerSearch),
		);
	}, [options, search]);

	// ネストされたグループ化オプション
	const groupedOptions = useMemo(() => {
		const categoryMap = new Map<string, Map<string, NestedOption[]>>();
		const ungroupedLabel = "その他";

		for (const option of filteredOptions) {
			const category = option.category || ungroupedLabel;
			const work = option.subgroup || ungroupedLabel;

			let workMap = categoryMap.get(category);
			if (!workMap) {
				workMap = new Map();
				categoryMap.set(category, workMap);
			}

			let opts = workMap.get(work);
			if (!opts) {
				opts = [];
				workMap.set(work, opts);
			}
			opts.push(option);
		}

		const result: CategoryGroup[] = [];
		for (const [category, workMap] of categoryMap) {
			const works: WorkGroup[] = [];
			for (const [workName, opts] of workMap) {
				works.push({ workName, options: opts });
			}
			result.push({ category, works });
		}

		// カテゴリでソート
		result.sort((a, b) => {
			if (a.category === "その他") return 1;
			if (b.category === "その他") return -1;
			if (categoryOrder) {
				const aIndex = categoryOrder.indexOf(a.category);
				const bIndex = categoryOrder.indexOf(b.category);
				if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
			}
			return a.category.localeCompare(b.category, "ja");
		});

		return result;
	}, [filteredOptions, categoryOrder]);

	// 原曲を選択/解除
	const toggleSong = useCallback(
		(option: NestedOption) => {
			if (selectedIds.has(option.value)) {
				// 解除
				onChange(selectedSongs.filter((s) => s.id !== option.value));
			} else {
				// 選択
				onChange([
					...selectedSongs,
					{
						id: option.value,
						name: option.label,
						workName: option.subgroup,
						categoryName: option.category,
					},
				]);
			}
		},
		[selectedIds, selectedSongs, onChange],
	);

	// 選択中の原曲を削除
	const removeSong = useCallback(
		(id: string) => {
			onChange(selectedSongs.filter((s) => s.id !== id));
		},
		[selectedSongs, onChange],
	);

	const hasOptions = groupedOptions.some((cat) =>
		cat.works.some((work) => work.options.length > 0),
	);

	return (
		<div className={cn("space-y-3", className)}>
			{/* 選択中の原曲チップ */}
			{selectedSongs.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedSongs.map((song) => (
						<div
							key={song.id}
							className="badge badge-primary gap-1 pr-1 transition-all hover:opacity-80"
						>
							<Music className="h-3 w-3" />
							<span className="max-w-[120px] truncate">{song.name}</span>
							<button
								type="button"
								onClick={() => removeSong(song.id)}
								className="ml-1 rounded-full p-0.5 transition-colors hover:bg-base-content/20"
								aria-label={`${song.name}を削除`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* 原曲追加ボタン/ドロップダウン */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					className="btn btn-outline btn-sm gap-2"
				>
					<Plus className="h-4 w-4" />
					原曲を追加
				</button>

				{/* ドロップダウンパネル */}
				{isDropdownOpen && (
					<div className="absolute top-full left-0 z-50 mt-2 w-full max-w-md rounded-lg border border-base-300 bg-base-100 shadow-lg">
						{/* ヘッダー */}
						<div className="flex items-center justify-between border-base-300 border-b p-2">
							<span className="font-medium text-sm">原曲を選択</span>
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
									placeholder="原曲を検索..."
									className="input input-sm input-bordered w-full pl-9"
								/>
							</div>
						</div>

						{/* オプションリスト */}
						<div className="max-h-72 overflow-y-auto">
							{!hasOptions ? (
								<div className="p-4 text-center text-base-content/50">
									該当する原曲がありません
								</div>
							) : (
								groupedOptions.map((categoryGroup) => (
									<div key={categoryGroup.category}>
										{/* カテゴリヘッダー（Level 1） */}
										<div className="sticky top-0 z-20 bg-base-300 px-4 py-2 font-semibold text-base-content text-sm">
											{categoryGroup.category}
										</div>

										{categoryGroup.works.map((workGroup) => (
											<div key={workGroup.workName}>
												{/* 作品ヘッダー（Level 2） */}
												<div className="sticky top-[36px] z-10 bg-base-200 px-4 py-1 pl-6 font-medium text-base-content/70 text-xs">
													{workGroup.workName}
												</div>

												{/* 楽曲（Level 3） */}
												{workGroup.options.map((option) => {
													const isSelected = selectedIds.has(option.value);
													return (
														<button
															key={option.value}
															type="button"
															onClick={() => toggleSong(option)}
															className={cn(
																"flex w-full items-center gap-2 py-2 pr-4 pl-10 text-left transition-colors hover:bg-base-200",
																isSelected &&
																	"bg-primary/10 font-medium text-primary",
															)}
														>
															<div
																className={cn(
																	"flex h-4 w-4 shrink-0 items-center justify-center rounded border",
																	isSelected
																		? "border-primary bg-primary text-primary-content"
																		: "border-base-300",
																)}
															>
																{isSelected && <Check className="h-3 w-3" />}
															</div>
															<span>{option.label}</span>
														</button>
													);
												})}
											</div>
										))}
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
