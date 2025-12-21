import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Option {
	value: string;
	label: string;
}

interface OptionGroup {
	label: string;
	options: Option[];
}

interface SearchableGroupedSelectProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	groups: OptionGroup[];
	placeholder?: string;
	searchPlaceholder?: string;
	className?: string;
}

export function SearchableGroupedSelect({
	id,
	value,
	onChange,
	groups,
	placeholder = "選択してください",
	searchPlaceholder = "検索...",
	className,
}: SearchableGroupedSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 選択中のラベルを取得
	const selectedLabel = useMemo(() => {
		for (const group of groups) {
			const option = group.options.find((o) => o.value === value);
			if (option) return option.label;
		}
		return null;
	}, [groups, value]);

	// 検索でフィルタリング
	const filteredGroups = useMemo(() => {
		if (!search) return groups;
		const lowerSearch = search.toLowerCase();
		return groups
			.map((group) => ({
				...group,
				options: group.options.filter((o) =>
					o.label.toLowerCase().includes(lowerSearch),
				),
			}))
			.filter((group) => group.options.length > 0);
	}, [groups, search]);

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

	const handleSelect = (optionValue: string) => {
		onChange(optionValue);
		setIsOpen(false);
		setSearch("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* トリガーボタン */}
			<button
				type="button"
				id={id}
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"select select-bordered flex w-full items-center justify-between text-left",
					!selectedLabel && "text-base-content/50",
				)}
			>
				<span className="truncate">{selectedLabel || placeholder}</span>
				{value && (
					<X
						className="h-4 w-4 shrink-0 hover:text-error"
						onClick={handleClear}
					/>
				)}
			</button>

			{/* ドロップダウン */}
			{isOpen && (
				<div className="absolute z-50 mt-1 max-h-80 w-max min-w-full max-w-md overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-lg">
					{/* 検索欄 */}
					<div className="border-base-300 border-b p-2">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-base-content/50" />
							<input
								ref={inputRef}
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder={searchPlaceholder}
								className="input input-sm input-bordered w-full pl-9"
							/>
						</div>
					</div>

					{/* オプションリスト */}
					<div className="max-h-60 overflow-y-auto">
						{filteredGroups.length === 0 ? (
							<div className="p-4 text-center text-base-content/50">
								該当なし
							</div>
						) : (
							filteredGroups.map((group) => (
								<div key={group.label}>
									{/* グループヘッダー */}
									<div className="sticky top-0 bg-base-200 px-3 py-2 font-bold text-base-content/70 text-xs uppercase tracking-wider">
										{group.label}
									</div>
									{/* オプション */}
									{group.options.map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() => handleSelect(option.value)}
											className={cn(
												"w-full px-4 py-2 text-left transition-colors hover:bg-base-200",
												value === option.value &&
													"bg-primary/10 font-medium text-primary",
											)}
										>
											{option.label}
										</button>
									))}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
