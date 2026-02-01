import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { GenreBadge } from "./genre-badge";

interface Genre {
	code: string;
	nameJa: string;
	nameEn: string;
	color: string;
	icon?: string;
}

interface GenreMultiSelectProps {
	id?: string;
	value: string[];
	onChange: (codes: string[]) => void;
	options: Genre[];
	maxItems?: number;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

function GenreMultiSelect({
	id,
	value,
	onChange,
	options,
	maxItems = 5,
	disabled = false,
	placeholder = "ジャンルを選択...",
	className,
}: GenreMultiSelectProps) {
	const generatedId = useId();
	const componentId = id || generatedId;
	const listboxId = `${componentId}-listbox`;

	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 選択中のジャンル情報を取得
	const selectedGenres = useMemo(() => {
		return value
			.map((code) => options.find((o) => o.code === code))
			.filter((g): g is Genre => g !== undefined);
	}, [options, value]);

	// 残り選択可能件数
	const remainingCount = maxItems - value.length;
	const isMaxReached = remainingCount <= 0;

	// 選択済みを除外し、検索でフィルタリング
	const availableOptions = useMemo(() => {
		const selectedSet = new Set(value);
		const filtered = options.filter((o) => !selectedSet.has(o.code));

		if (!search) return filtered;

		const lowerSearch = search.toLowerCase();
		return filtered.filter(
			(o) =>
				o.nameJa.toLowerCase().includes(lowerSearch) ||
				o.nameEn.toLowerCase().includes(lowerSearch),
		);
	}, [options, value, search]);

	// 外側クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// 開いたときに検索欄にフォーカス
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	const handleSelect = (code: string) => {
		if (isMaxReached) return;
		onChange([...value, code]);
		setSearch("");
		// 最大件数に達したら閉じる
		if (remainingCount === 1) {
			setIsOpen(false);
		}
	};

	const handleRemove = (code: string) => {
		onChange(value.filter((c) => c !== code));
	};

	const handleTriggerClick = () => {
		if (disabled || isMaxReached) return;
		setIsOpen(!isOpen);
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* 選択済みバッジとトリガー */}
			<div
				className={cn(
					"flex min-h-12 flex-wrap items-center gap-1.5 rounded-btn border border-base-300 bg-base-100 px-3 py-2",
					disabled && "cursor-not-allowed opacity-50",
					!disabled && !isMaxReached && "cursor-pointer",
				)}
				onClick={handleTriggerClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleTriggerClick();
					}
				}}
				role="combobox"
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-controls={listboxId}
				aria-disabled={disabled}
				tabIndex={disabled ? -1 : 0}
			>
				{/* 選択済みのバッジ */}
				{selectedGenres.map((genre) => (
					<GenreBadge
						key={genre.code}
						code={genre.code}
						name={genre.nameJa}
						color={genre.color}
						icon={genre.icon}
						size="sm"
						onRemove={disabled ? undefined : () => handleRemove(genre.code)}
					/>
				))}

				{/* プレースホルダーまたは残り件数表示 */}
				{!isMaxReached && (
					<span className="ml-1 text-base-content/50 text-sm">
						{value.length === 0
							? placeholder
							: `あと${remainingCount}件選択可能`}
					</span>
				)}
				{isMaxReached && value.length > 0 && (
					<span className="ml-1 text-base-content/40 text-xs">
						(最大{maxItems}件)
					</span>
				)}
			</div>

			{/* ドロップダウン */}
			{isOpen && !isMaxReached && (
				<div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-lg">
					{/* 検索欄 */}
					<div className="border-base-300 border-b p-2">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-base-content/50" />
							<input
								ref={inputRef}
								type="text"
								id={id ? `${id}-search` : undefined}
								name={id ? `${id}-search` : undefined}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="検索..."
								className="input input-sm input-bordered w-full pl-9"
							/>
						</div>
					</div>

					{/* オプションリスト */}
					<div
						role="listbox"
						id={listboxId}
						aria-label={placeholder}
						aria-multiselectable="true"
						className="max-h-60 overflow-y-auto"
					>
						{availableOptions.length === 0 ? (
							<div className="p-4 text-center text-base-content/50">
								{search
									? "該当するジャンルがありません"
									: "選択可能なジャンルがありません"}
							</div>
						) : (
							availableOptions.map((genre) => (
								<button
									key={genre.code}
									type="button"
									role="option"
									id={`${componentId}-option-${genre.code}`}
									aria-selected={false}
									onClick={() => handleSelect(genre.code)}
									className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-base-200"
								>
									{/* カラーインジケーター */}
									<span
										className="size-3 shrink-0 rounded-full"
										style={{ backgroundColor: genre.color }}
									/>
									{/* ジャンル名 */}
									<span className="flex-1">
										<span className="font-medium">{genre.nameEn}</span>
										<span className="ml-2 text-base-content/60 text-sm">
											{genre.nameJa}
										</span>
									</span>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export { GenreMultiSelect };
export type { Genre, GenreMultiSelectProps };
