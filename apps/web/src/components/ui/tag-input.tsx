import { useQuery } from "@tanstack/react-query";
import { Hash, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { tagsApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { TagBadge } from "./tag-badge";

interface TagItem {
	name: string;
	isLocked?: boolean;
}

interface TagInputProps {
	id?: string;
	value: TagItem[];
	onChange: (tags: TagItem[]) => void;
	maxTags?: number;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

function TagInput({
	id,
	value,
	onChange,
	maxTags = 15,
	disabled = false,
	placeholder = "タグを入力...",
	className,
}: TagInputProps) {
	const generatedId = useId();
	const componentId = id || generatedId;
	const listboxId = `${componentId}-listbox`;

	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [isComposing, setIsComposing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 検索のデバウンス
	const debouncedSearch = useDebounce(search, 300);

	// 残り選択可能件数
	const remainingCount = maxTags - value.length;
	const isMaxReached = remainingCount <= 0;

	// 既存タグの検索（サジェスト用）
	const { data: tagsData, isFetching } = useQuery({
		queryKey: ["tags", { search: debouncedSearch, limit: 10 }],
		queryFn: () => tagsApi.list({ search: debouncedSearch, limit: 10 }),
		staleTime: 60_000,
		enabled: isOpen && debouncedSearch.length > 0,
	});

	// 選択済みタグ名のSet（大文字小文字区別なし）
	const selectedTagNames = useMemo(
		() => new Set(value.map((t) => t.name.toLowerCase())),
		[value],
	);

	// 選択可能なタグ（選択済みを除外）
	const availableOptions = useMemo(() => {
		if (!tagsData?.data) return [];
		return tagsData.data.filter(
			(t) => !selectedTagNames.has(t.name.toLowerCase()),
		);
	}, [tagsData?.data, selectedTagNames]);

	// 入力値が既存タグと一致するかチェック（大文字小文字区別なし）
	const isExactMatch = useMemo(() => {
		if (!search) return false;
		const lowerSearch = search.toLowerCase();
		// 既存タグまたは選択済みタグと一致
		const existsInOptions = tagsData?.data?.some(
			(t) => t.name.toLowerCase() === lowerSearch,
		);
		const existsInSelected = value.some(
			(t) => t.name.toLowerCase() === lowerSearch,
		);
		return existsInOptions || existsInSelected;
	}, [search, tagsData?.data, value]);

	// 重複チェック（大文字小文字区別なし）
	const isDuplicate = useMemo(() => {
		if (!search) return false;
		const lowerSearch = search.toLowerCase();
		return value.some((t) => t.name.toLowerCase() === lowerSearch);
	}, [search, value]);

	// 外側クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// 既存タグを選択（サジェストから選択）
	const handleSelectTag = (tag: { id: string; name: string }) => {
		if (isMaxReached || selectedTagNames.has(tag.name.toLowerCase())) return;
		onChange([...value, { name: tag.name }]);
		setSearch("");
		inputRef.current?.focus();
		// 最大件数に達したら閉じる
		if (remainingCount === 1) {
			setIsOpen(false);
		}
	};

	// 新規タグを追加（名前のみ）
	const handleAddTag = () => {
		if (isMaxReached || !search.trim() || isDuplicate) return;

		const trimmedName = search.trim();

		// 既存タグと一致する場合はその名前を使用
		const existingTag = tagsData?.data?.find(
			(t) => t.name.toLowerCase() === trimmedName.toLowerCase(),
		);

		onChange([...value, { name: existingTag?.name ?? trimmedName }]);
		setSearch("");
		inputRef.current?.focus();
		// 最大件数に達したら閉じる
		if (remainingCount === 1) {
			setIsOpen(false);
		}
	};

	// タグを削除
	const handleRemoveTag = (tagName: string) => {
		const tag = value.find((t) => t.name === tagName);
		// ロックされたタグは削除不可
		if (tag?.isLocked) return;
		onChange(value.filter((t) => t.name !== tagName));
	};

	// キーボードイベント
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// IME変換中は無視
		if (isComposing) return;

		if (e.key === "Enter") {
			e.preventDefault();
			if (search.trim()) {
				handleAddTag();
			}
		} else if (e.key === ",") {
			e.preventDefault();
			if (search.trim()) {
				handleAddTag();
			}
		} else if (e.key === "Backspace" && !search) {
			// 最後のロックされていないタグを削除
			const lastUnlockedTag = [...value].reverse().find((t) => !t.isLocked);
			if (lastUnlockedTag) {
				handleRemoveTag(lastUnlockedTag.name);
			}
		} else if (e.key === "Escape") {
			setIsOpen(false);
			inputRef.current?.blur();
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setSearch(newValue);
		if (newValue && !isOpen) {
			setIsOpen(true);
		}
	};

	const handleInputFocus = () => {
		if (!disabled && !isMaxReached) {
			setIsOpen(true);
		}
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* 入力エリアとバッジ - クリックで内部のinputにフォーカスを移動する補助的な役割 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: このdivはクリック時にinput要素へフォーカスを移動する補助的な役割のみ。実際のキーボード操作は内部のinput要素が担当 */}
			<div
				className={cn(
					"flex min-h-12 flex-wrap items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-3 py-2",
					disabled && "cursor-not-allowed opacity-50",
					!disabled && "focus-within:border-primary focus-within:outline-none",
				)}
				onClick={() => inputRef.current?.focus()}
			>
				{/* 選択済みのバッジ */}
				{value.map((tag) => (
					<TagBadge
						key={tag.name}
						name={tag.name}
						isLocked={tag.isLocked}
						onRemove={
							disabled || tag.isLocked
								? undefined
								: () => handleRemoveTag(tag.name)
						}
					/>
				))}

				{/* 入力フィールド */}
				{!isMaxReached && (
					<input
						ref={inputRef}
						type="text"
						id={componentId}
						name={componentId}
						value={search}
						onChange={handleInputChange}
						onFocus={handleInputFocus}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => setIsComposing(true)}
						onCompositionEnd={() => setIsComposing(false)}
						placeholder={value.length === 0 ? placeholder : ""}
						disabled={disabled}
						className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/50"
						role="combobox"
						aria-expanded={isOpen}
						aria-haspopup="listbox"
						aria-controls={listboxId}
						aria-autocomplete="list"
						autoComplete="off"
						data-1p-ignore
						data-lpignore="true"
						data-form-type="other"
					/>
				)}

				{/* 残り件数表示 */}
				{!isMaxReached && value.length > 0 && (
					<span className="ml-auto text-base-content/40 text-xs">
						あと{remainingCount}件
					</span>
				)}
				{isMaxReached && (
					<span className="ml-auto text-base-content/40 text-xs">
						(最大{maxTags}件)
					</span>
				)}
			</div>

			{/* ドロップダウン */}
			{isOpen && !isMaxReached && (
				<div className="absolute z-50 mt-1 max-h-64 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-lg">
					{/* 検索中インジケーター */}
					{isFetching && debouncedSearch && (
						<div className="flex items-center gap-2 px-4 py-2 text-base-content/50 text-sm">
							<span className="loading loading-spinner loading-xs" />
							検索中...
						</div>
					)}

					{/* 候補リスト */}
					<div
						role="listbox"
						id={listboxId}
						aria-label="タグ候補"
						className="max-h-48 overflow-y-auto"
					>
						{/* 既存タグ候補 */}
						{availableOptions.map((tag) => (
							<button
								key={tag.id}
								type="button"
								role="option"
								id={`${componentId}-option-${tag.id}`}
								aria-selected={false}
								onClick={() => handleSelectTag(tag)}
								className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-base-200"
							>
								<Hash className="h-4 w-4 text-base-content/50" />
								<span className="flex-1 font-medium">{tag.name}</span>
								<span className="text-base-content/40 text-xs">
									{tag.trackCount}件
								</span>
							</button>
						))}

						{/* 新規タグ追加オプション */}
						{search.trim() && !isDuplicate && !isExactMatch && (
							<button
								type="button"
								onClick={handleAddTag}
								className="flex w-full items-center gap-3 border-base-300 border-t px-4 py-2 text-left transition-colors hover:bg-base-200"
							>
								<Hash className="h-4 w-4 text-primary" />
								<span className="flex-1">
									<span className="text-primary">
										&quot;{search.trim()}&quot;
									</span>
									<span className="ml-2 text-base-content/60 text-sm">
										を追加
									</span>
								</span>
							</button>
						)}

						{/* 重複エラー */}
						{search.trim() && isDuplicate && (
							<div className="px-4 py-2 text-error text-sm">
								このタグは既に追加されています
							</div>
						)}

						{/* 結果なし */}
						{!isFetching &&
							debouncedSearch &&
							availableOptions.length === 0 &&
							!isDuplicate &&
							isExactMatch && (
								<div className="px-4 py-2 text-center text-base-content/50 text-sm">
									該当するタグがありません
								</div>
							)}

						{/* 入力を促す */}
						{!debouncedSearch && availableOptions.length === 0 && (
							<div className="flex items-center gap-2 px-4 py-4 text-center text-base-content/50 text-sm">
								<Search className="h-4 w-4" />
								タグ名を入力して検索または追加
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export { TagInput };
export type { TagInputProps, TagItem };
