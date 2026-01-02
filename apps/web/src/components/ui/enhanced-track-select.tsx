import { Check, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TrackListItem } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface EnhancedTrackSelectProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	tracks: TrackListItem[];
	excludeTrackIds?: string[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
}

export function EnhancedTrackSelect({
	id,
	value,
	onChange,
	tracks,
	excludeTrackIds = [],
	placeholder = "トラックを選択",
	searchPlaceholder = "トラック名、作品名、サークル名で検索...",
	emptyMessage = "トラックが見つかりません",
	clearable = true,
	disabled = false,
	className,
}: EnhancedTrackSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [dropdownStyle, setDropdownStyle] =
		useState<React.CSSProperties | null>(null);
	const [portalContainer, setPortalContainer] = useState<Element | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 除外トラックを除いたリスト
	const availableTracks = useMemo(() => {
		return tracks.filter((t) => !excludeTrackIds.includes(t.id));
	}, [tracks, excludeTrackIds]);

	// 選択中のトラック
	const selectedTrack = useMemo(() => {
		return availableTracks.find((t) => t.id === value) ?? null;
	}, [availableTracks, value]);

	// 検索でフィルタリング
	const filteredTracks = useMemo(() => {
		if (!search) return availableTracks;
		const lowerSearch = search.toLowerCase();
		return availableTracks.filter((t) => {
			const searchableText = [
				t.name,
				t.nameJa,
				t.nameEn,
				t.releaseName,
				t.circles,
				t.eventName,
				t.vocalists,
				t.arrangers,
				t.lyricists,
				t.originalSongs,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return searchableText.includes(lowerSearch);
		});
	}, [availableTracks, search]);

	// ドロップダウンの位置を計算
	const updateDropdownPosition = useCallback(() => {
		if (!triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom;
		const dropdownHeight = 550; // max-h-[500px] + padding

		// 下に十分なスペースがあれば下に、なければ上に表示
		const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

		setDropdownStyle({
			position: "fixed",
			left: rect.left,
			width: Math.max(rect.width, 600), // 最小幅600px
			...(showAbove
				? { bottom: viewportHeight - rect.top + 4 }
				: { top: rect.bottom + 4 }),
		});
	}, []);

	// 外側クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			const isInsideContainer = containerRef.current?.contains(target);
			const isInsideDropdown = (e.target as Element)?.closest?.(
				"[data-enhanced-track-select-dropdown]",
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

	// 開いたときに検索欄にフォーカス
	useEffect(() => {
		if (isOpen) {
			// ポータルのコンテナを探す（モーダル内の場合はモーダルを使用）
			const modal = triggerRef.current?.closest(".modal");
			setPortalContainer(modal || document.body);

			// DOMレンダリング後に位置を計算
			requestAnimationFrame(() => {
				updateDropdownPosition();
				inputRef.current?.focus();
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

	const handleSelect = (trackId: string) => {
		onChange(trackId);
		closeDropdown();
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		closeDropdown();
	};

	// 選択中のトラック表示ラベル
	const getSelectedLabel = () => {
		if (!selectedTrack) return null;
		const parts = [selectedTrack.name];
		if (selectedTrack.releaseName) {
			parts.push(`（${selectedTrack.releaseName}）`);
		}
		return parts.join("");
	};

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
					!selectedTrack && "text-base-content/50",
					disabled && "cursor-not-allowed opacity-50",
				)}
			>
				<span className="truncate pr-6">
					{getSelectedLabel() || placeholder}
				</span>
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

			{/* ドロップダウン（ポータルでモーダル外に描画） */}
			{isOpen &&
				dropdownStyle &&
				portalContainer &&
				createPortal(
					<div
						data-enhanced-track-select-dropdown
						style={{ ...dropdownStyle, zIndex: 10000 }}
						className="overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-lg"
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

						{/* トラックリスト */}
						<div className="max-h-[500px] overflow-y-auto">
							{filteredTracks.length === 0 ? (
								<div className="p-4 text-center text-base-content/50">
									{emptyMessage}
								</div>
							) : (
								<div className="divide-y divide-base-200">
									{filteredTracks.map((track) => (
										<TrackOptionCard
											key={track.id}
											track={track}
											isSelected={value === track.id}
											onSelect={() => handleSelect(track.id)}
										/>
									))}
								</div>
							)}
						</div>
					</div>,
					portalContainer,
				)}
		</div>
	);
}

interface TrackOptionCardProps {
	track: TrackListItem;
	isSelected: boolean;
	onSelect: () => void;
}

function TrackOptionCard({
	track,
	isSelected,
	onSelect,
}: TrackOptionCardProps) {
	// イベント表示（日付含む）
	const eventDisplay = useMemo(() => {
		if (!track.eventName) return null;
		if (track.eventDayDate) {
			return `${track.eventName} (${track.eventDayDate})`;
		}
		return track.eventName;
	}, [track.eventName, track.eventDayDate]);

	// 作品/ディスク表示
	const releaseDisplay = useMemo(() => {
		if (!track.releaseName) return null;
		if (track.discNumber && track.discNumber > 1) {
			return `${track.releaseName} / Disc ${track.discNumber}`;
		}
		return track.releaseName;
	}, [track.releaseName, track.discNumber]);

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"w-full p-3 text-left transition-colors hover:bg-base-200",
				isSelected && "bg-primary/10",
			)}
		>
			<span className="flex items-start gap-2">
				{/* 選択チェック */}
				<span className="mt-0.5 w-5 shrink-0">
					{isSelected && <Check className="h-4 w-4 text-primary" />}
				</span>

				{/* トラック情報 */}
				<span className="block min-w-0 flex-1 space-y-1">
					{/* トラック名 + 番号 */}
					<span className="flex items-center gap-2">
						<span className={cn("font-medium", isSelected && "text-primary")}>
							{track.name}
						</span>
						<span className="shrink-0 rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">
							{String(track.trackNumber).padStart(2, "0")}
						</span>
					</span>

					{/* 詳細情報 */}
					<span className="block space-y-0.5 text-base-content/70 text-xs">
						{/* 作品 / ディスク */}
						{releaseDisplay && (
							<span className="flex items-center gap-1.5">
								<span className="shrink-0">作品:</span>
								<span className="truncate">{releaseDisplay}</span>
							</span>
						)}

						{/* サークル */}
						{track.circles && (
							<span className="flex items-center gap-1.5">
								<span className="shrink-0">サークル:</span>
								<span className="truncate">{track.circles}</span>
							</span>
						)}

						{/* イベント */}
						{eventDisplay && (
							<span className="flex items-center gap-1.5">
								<span className="shrink-0">イベント:</span>
								<span className="truncate">{eventDisplay}</span>
							</span>
						)}

						{/* 原曲 */}
						{track.originalSongs && (
							<span className="flex items-center gap-1.5">
								<span className="shrink-0">原曲:</span>
								<span className="truncate">{track.originalSongs}</span>
							</span>
						)}

						{/* クレジット */}
						<span className="flex flex-wrap gap-x-3 gap-y-0.5">
							{track.vocalists && (
								<span>
									<span className="text-base-content/50">Vo:</span>{" "}
									{track.vocalists}
								</span>
							)}
							{track.arrangers && (
								<span>
									<span className="text-base-content/50">Arr:</span>{" "}
									{track.arrangers}
								</span>
							)}
							{track.lyricists && (
								<span>
									<span className="text-base-content/50">Ly:</span>{" "}
									{track.lyricists}
								</span>
							)}
						</span>
					</span>
				</span>
			</span>
		</button>
	);
}
