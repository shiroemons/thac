import { Check, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface NestedOption {
	value: string;
	label: string;
	category?: string;
	subgroup?: string;
}

interface NestedGroupedSearchableSelectProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: NestedOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
	ungroupedLabel?: string;
	categoryOrder?: readonly string[];
}

interface WorkGroup {
	workName: string;
	options: NestedOption[];
}

interface CategoryGroup {
	category: string;
	works: WorkGroup[];
}

export function NestedGroupedSearchableSelect({
	id,
	value,
	onChange,
	options,
	placeholder = "選択してください",
	searchPlaceholder = "検索...",
	emptyMessage = "該当なし",
	clearable = true,
	disabled = false,
	className,
	ungroupedLabel = "その他",
	categoryOrder,
}: NestedGroupedSearchableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [dropdownStyle, setDropdownStyle] =
		useState<React.CSSProperties | null>(null);
	const [portalContainer, setPortalContainer] = useState<Element | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<HTMLButtonElement>(null);

	// 選択中のラベルを取得
	const selectedLabel = useMemo(() => {
		const option = options.find((o) => o.value === value);
		return option?.label ?? null;
	}, [options, value]);

	// 検索でフィルタリング（楽曲名、作品名、カテゴリ名すべてで検索）
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
		// Map<category, Map<workName, options[]>>
		const categoryMap = new Map<string, Map<string, NestedOption[]>>();

		for (const option of filteredOptions) {
			const category = option.category || ungroupedLabel;
			const work = option.subgroup || ungroupedLabel;

			let workMap = categoryMap.get(category);
			if (!workMap) {
				workMap = new Map();
				categoryMap.set(category, workMap);
			}

			let options = workMap.get(work);
			if (!options) {
				options = [];
				workMap.set(work, options);
			}
			options.push(option);
		}

		// CategoryGroup[]に変換してソート
		const result: CategoryGroup[] = [];

		for (const [category, workMap] of categoryMap) {
			const works: WorkGroup[] = [];

			for (const [workName, opts] of workMap) {
				works.push({ workName, options: opts });
			}

			// 作品の順序は入力順（ID順）を維持

			result.push({ category, works });
		}

		// カテゴリでソート（categoryOrderが指定されていればその順序、ungroupedLabelは最後に）
		result.sort((a, b) => {
			if (a.category === ungroupedLabel) return 1;
			if (b.category === ungroupedLabel) return -1;
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
	}, [filteredOptions, ungroupedLabel, categoryOrder]);

	// ドロップダウンの位置を計算
	const updateDropdownPosition = useCallback(() => {
		if (triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			const dropdownHeight = 384; // max-h-96 = 24rem = 384px
			const spaceBelow = window.innerHeight - rect.bottom;
			const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

			setDropdownStyle({
				position: "fixed",
				left: rect.left,
				width: rect.width,
				...(showAbove
					? { bottom: window.innerHeight - rect.top + 4 }
					: { top: rect.bottom + 4 }),
			});
		}
	}, []);

	// 外側クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			const isInsideContainer = containerRef.current?.contains(target);
			const isInsideDropdown = (e.target as Element)?.closest?.(
				"[data-nested-select-dropdown]",
			);
			if (!isInsideContainer && !isInsideDropdown) {
				setIsOpen(false);
				setSearch("");
				setDropdownStyle(null);
				setPortalContainer(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// 開いたときに検索欄にフォーカスし、選択中の項目までスクロール
	useEffect(() => {
		if (isOpen) {
			// ポータルのコンテナを探す（モーダル内の場合はモーダルを使用）
			const modal = triggerRef.current?.closest(".modal");
			setPortalContainer(modal || document.body);

			// DOMレンダリング後に位置を計算
			requestAnimationFrame(() => {
				updateDropdownPosition();
				inputRef.current?.focus();
				// 選択中の項目までスクロール
				requestAnimationFrame(() => {
					if (selectedRef.current && listRef.current) {
						const listRect = listRef.current.getBoundingClientRect();
						const selectedRect = selectedRef.current.getBoundingClientRect();
						const scrollTop =
							selectedRef.current.offsetTop -
							listRef.current.offsetTop -
							listRect.height / 2 +
							selectedRect.height / 2;
						listRef.current.scrollTop = Math.max(0, scrollTop);
					}
				});
			});
		}
	}, [isOpen, updateDropdownPosition]);

	// ウィンドウリサイズ時にドロップダウン位置を更新
	useEffect(() => {
		if (!isOpen) return;
		const handleResize = () => updateDropdownPosition();
		window.addEventListener("resize", handleResize);
		window.addEventListener("scroll", handleResize, true);
		return () => {
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("scroll", handleResize, true);
		};
	}, [isOpen, updateDropdownPosition]);

	const closeDropdown = () => {
		setIsOpen(false);
		setSearch("");
		setDropdownStyle(null);
		setPortalContainer(null);
	};

	const handleSelect = (optionValue: string) => {
		onChange(optionValue);
		closeDropdown();
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		closeDropdown();
	};

	const hasOptions = groupedOptions.some((cat) =>
		cat.works.some((work) => work.options.length > 0),
	);

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* トリガーボタン */}
			<button
				ref={triggerRef}
				type="button"
				id={id}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={cn(
					"select select-bordered w-full text-left",
					!selectedLabel && "text-base-content/50",
					disabled && "cursor-not-allowed opacity-50",
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

			{/* ドロップダウン（ポータルでモーダル内に描画） */}
			{isOpen &&
				dropdownStyle &&
				portalContainer &&
				createPortal(
					<div
						data-nested-select-dropdown
						style={{ ...dropdownStyle, zIndex: 10000 }}
						className="max-h-96 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-lg"
					>
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
						<div ref={listRef} className="max-h-72 overflow-y-auto">
							{!hasOptions ? (
								<div className="p-4 text-center text-base-content/50">
									{emptyMessage}
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
												{workGroup.options.map((option) => (
													<button
														key={option.value}
														ref={value === option.value ? selectedRef : null}
														type="button"
														onClick={() => handleSelect(option.value)}
														className={cn(
															"flex w-full items-center gap-2 py-2 pr-4 pl-10 text-left transition-colors hover:bg-base-200",
															value === option.value &&
																"bg-primary/10 font-medium text-primary",
														)}
													>
														{value === option.value && (
															<Check className="h-4 w-4 shrink-0" />
														)}
														<span
															className={cn(value !== option.value && "ml-6")}
														>
															{option.label}
														</span>
													</button>
												))}
											</div>
										))}
									</div>
								))
							)}
						</div>
					</div>,
					portalContainer,
				)}
		</div>
	);
}
