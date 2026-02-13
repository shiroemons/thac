import { Plus, Search, Tag, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { PublicTagItem } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import type { SelectedTag } from "./types";

interface TagFilterProps {
	/** タグマスターデータ一覧 */
	tagList: PublicTagItem[];
	/** 選択中のタグリスト */
	selected: SelectedTag[];
	/** 選択変更ハンドラ */
	onSelectionChange: (tags: SelectedTag[]) => void;
	/** カスタムクラス名 */
	className?: string;
}

/**
 * タグ選択フィルター（複数選択・オートコンプリート対応）
 *
 * - テキスト入力でタグを検索（オートコンプリート）
 * - 選択中のタグをバッジで表示
 * - クリックで選択、×ボタンで削除
 * - 自由入力でタグを追加可能
 */
export function TagFilter({
	tagList,
	selected,
	onSelectionChange,
	className,
}: TagFilterProps) {
	const [search, setSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// 選択中のタグIDセット
	const selectedIds = useMemo(
		() => new Set((selected ?? []).map((t) => t.id)),
		[selected],
	);

	// 検索でフィルタリング＆ソート（名前順）
	const filteredTags = useMemo(() => {
		let result = (tagList ?? []).filter((tag) => !selectedIds.has(tag.id));

		if (search) {
			const lowerSearch = search.toLowerCase();
			result = result.filter((tag) =>
				tag.name.toLowerCase().includes(lowerSearch),
			);
		}

		// 名前順にソート
		return [...result].sort((a, b) => a.name.localeCompare(b.name, "ja"));
	}, [tagList, selectedIds, search]);

	// タグを選択
	const addTag = useCallback(
		(tag: PublicTagItem) => {
			onSelectionChange([
				...(selected ?? []),
				{
					id: tag.id,
					name: tag.name,
				},
			]);
			setSearch("");
			setIsDropdownOpen(false);
		},
		[selected, onSelectionChange],
	);

	// 選択中のタグを削除
	const removeTag = useCallback(
		(id: string) => {
			onSelectionChange((selected ?? []).filter((t) => t.id !== id));
		},
		[selected, onSelectionChange],
	);

	// 入力フィールドにフォーカスした時
	const handleInputFocus = useCallback(() => {
		setIsDropdownOpen(true);
	}, []);

	// 入力値変更時
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value);
			setIsDropdownOpen(true);
		},
		[],
	);

	// キーボード操作
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Escape") {
				setIsDropdownOpen(false);
				inputRef.current?.blur();
			} else if (e.key === "Enter" && search.trim()) {
				e.preventDefault();
				// 既存のタグがあればそれを選択、なければ自由入力として追加
				const existingTag = filteredTags.find(
					(tag) => tag.name.toLowerCase() === search.trim().toLowerCase(),
				);
				if (existingTag) {
					addTag(existingTag);
				} else {
					// 自由入力タグとして追加（IDは一時的なもの）
					onSelectionChange([
						...(selected ?? []),
						{
							id: `custom-${Date.now()}`,
							name: search.trim(),
						},
					]);
					setSearch("");
					setIsDropdownOpen(false);
				}
			}
		},
		[search, filteredTags, addTag, onSelectionChange, selected],
	);

	return (
		<div className={cn("space-y-3", className)}>
			{/* 選択中のタグチップ */}
			{(selected ?? []).length > 0 && (
				<div className="flex flex-wrap gap-2">
					{(selected ?? []).map((tag) => (
						<div
							key={tag.id}
							className="badge badge-warning gap-1 pr-1 transition-all hover:opacity-80"
						>
							<Tag className="h-3 w-3" />
							<span>{tag.name}</span>
							<button
								type="button"
								onClick={() => removeTag(tag.id)}
								className="ml-1 rounded-full p-0.5 transition-colors hover:bg-base-content/20"
								aria-label={`${tag.name}を削除`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* タグ追加ボタン/ドロップダウン */}
			<div className="relative">
				<button
					type="button"
					onClick={() => {
						setIsDropdownOpen(!isDropdownOpen);
						if (!isDropdownOpen) {
							// ドロップダウンを開く際にフォーカス
							setTimeout(() => inputRef.current?.focus(), 0);
						}
					}}
					className="btn btn-outline btn-sm gap-2"
				>
					<Plus className="h-4 w-4" />
					タグを追加
				</button>

				{/* ドロップダウンパネル */}
				{isDropdownOpen && (
					<div className="absolute top-full left-0 z-50 mt-2 w-full max-w-md rounded-lg border border-base-300 bg-base-100 shadow-lg">
						{/* ヘッダー */}
						<div className="flex items-center justify-between border-base-300 border-b p-2">
							<span className="font-medium text-sm">タグを選択</span>
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
									ref={inputRef}
									type="text"
									value={search}
									onChange={handleInputChange}
									onFocus={handleInputFocus}
									onKeyDown={handleKeyDown}
									placeholder="タグを検索..."
									className="input input-sm w-full pl-9"
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
						</div>

						{/* 自由入力ヒント */}
						{search.trim() &&
							!filteredTags.some(
								(t) => t.name.toLowerCase() === search.trim().toLowerCase(),
							) && (
								<div className="border-base-300 border-b px-4 py-2 text-sm">
									<button
										type="button"
										onClick={() => {
											onSelectionChange([
												...(selected ?? []),
												{
													id: `custom-${Date.now()}`,
													name: search.trim(),
												},
											]);
											setSearch("");
											setIsDropdownOpen(false);
										}}
										className="flex items-center gap-2 text-primary hover:underline"
									>
										<Plus className="h-4 w-4" />「{search.trim()}」で検索
									</button>
								</div>
							)}

						{/* オプションリスト */}
						<div className="max-h-72 overflow-y-auto">
							{filteredTags.length === 0 ? (
								<div className="p-4 text-center text-base-content/50">
									{search
										? "該当するタグがありません"
										: "選択可能なタグがありません"}
								</div>
							) : (
								filteredTags.slice(0, 50).map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={() => addTag(tag)}
										className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-base-200"
									>
										<div className="flex items-center gap-2">
											<Tag className="h-4 w-4 text-base-content/60" />
											<span>{tag.name}</span>
										</div>
									</button>
								))
							)}

							{/* さらに候補がある場合の表示 */}
							{filteredTags.length > 50 && (
								<div className="border-base-300 border-t p-2 text-center text-base-content/50 text-xs">
									他 {filteredTags.length - 50} 件の候補があります。
									<br />
									検索語を追加して絞り込んでください。
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* タグが空の場合 */}
			{(tagList ?? []).length === 0 && (
				<div className="py-4 text-center text-base-content/50">
					タグデータがありません
				</div>
			)}
		</div>
	);
}
