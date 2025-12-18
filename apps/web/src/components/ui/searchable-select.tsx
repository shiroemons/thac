import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Option {
	value: string;
	label: string;
}

interface SearchableSelectProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	clearable?: boolean;
	className?: string;
}

export function SearchableSelect({
	id,
	value,
	onChange,
	options,
	placeholder = "選択してください",
	searchPlaceholder = "検索...",
	emptyMessage = "該当なし",
	clearable = true,
	className,
}: SearchableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 選択中のラベルを取得
	const selectedLabel = useMemo(() => {
		const option = options.find((o) => o.value === value);
		return option?.label ?? null;
	}, [options, value]);

	// 検索でフィルタリング
	const filteredOptions = useMemo(() => {
		if (!search) return options;
		const lowerSearch = search.toLowerCase();
		return options.filter((o) => o.label.toLowerCase().includes(lowerSearch));
	}, [options, search]);

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
		setIsOpen(false);
		setSearch("");
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* トリガーボタン */}
			<button
				type="button"
				id={id}
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"select select-bordered w-full text-left",
					!selectedLabel && "text-base-content/50",
				)}
			>
				<span className="truncate pr-6">{selectedLabel || placeholder}</span>
			</button>
			{/* クリアボタン */}
			{clearable && value && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute top-1/2 right-8 -translate-y-1/2 rounded p-1 text-base-content/50 hover:bg-base-200 hover:text-base-content"
				>
					<X className="h-4 w-4" />
				</button>
			)}

			{/* ドロップダウン */}
			{isOpen && (
				<div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-lg">
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
						{filteredOptions.length === 0 ? (
							<div className="p-4 text-center text-base-content/50">
								{emptyMessage}
							</div>
						) : (
							filteredOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => handleSelect(option.value)}
									className={cn(
										"flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-base-200",
										value === option.value &&
											"bg-primary/10 font-medium text-primary",
									)}
								>
									{value === option.value && (
										<Check className="h-4 w-4 shrink-0" />
									)}
									<span className={cn(value !== option.value && "ml-6")}>
										{option.label}
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
