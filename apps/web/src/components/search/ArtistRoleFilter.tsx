import { Check, Plus, Search, Users, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { MockArtist } from "./mock-data";
import type { CreditRole, SelectedArtist } from "./types";
import { ROLE_LABELS } from "./types";

interface ArtistRoleFilterProps {
	/** 選択中のアーティストリスト */
	selectedArtists: SelectedArtist[];
	/** 選択変更ハンドラ */
	onChange: (artists: SelectedArtist[]) => void;
	/** 選択可能なアーティストオプション */
	options: MockArtist[];
	/** カスタムクラス名 */
	className?: string;
}

/** 選択可能な役割（主要なもののみ） */
const SELECTABLE_ROLES: CreditRole[] = [
	"vocalist",
	"lyricist",
	"arranger",
	"composer",
];

/**
 * 役割別アーティスト選択フィルター（複数選択対応）
 *
 * - タブで役割を切り替え
 * - 各役割でアーティストを複数選択可能
 * - 選択中のアーティストをチップで表示（役割付き）
 */
export function ArtistRoleFilter({
	selectedArtists,
	onChange,
	options,
	className,
}: ArtistRoleFilterProps) {
	const [activeRole, setActiveRole] = useState<CreditRole>("vocalist");
	const [search, setSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// 役割ごとの選択数
	const roleCountMap = useMemo(() => {
		const map = new Map<CreditRole, number>();
		for (const artist of selectedArtists) {
			map.set(artist.role, (map.get(artist.role) || 0) + 1);
		}
		return map;
	}, [selectedArtists]);

	// 現在の役割で選択中のIDセット
	const selectedIdsForRole = useMemo(() => {
		return new Set(
			selectedArtists.filter((a) => a.role === activeRole).map((a) => a.id),
		);
	}, [selectedArtists, activeRole]);

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

	// アーティストを選択/解除
	const toggleArtist = useCallback(
		(artist: MockArtist) => {
			const existingIndex = selectedArtists.findIndex(
				(a) => a.id === artist.id && a.role === activeRole,
			);

			if (existingIndex >= 0) {
				// 解除
				const newArtists = [...selectedArtists];
				newArtists.splice(existingIndex, 1);
				onChange(newArtists);
			} else {
				// 選択
				onChange([
					...selectedArtists,
					{ id: artist.id, name: artist.name, role: activeRole },
				]);
			}
		},
		[selectedArtists, activeRole, onChange],
	);

	// 選択中のアーティストを削除
	const removeArtist = useCallback(
		(id: string, role: CreditRole) => {
			onChange(
				selectedArtists.filter((a) => !(a.id === id && a.role === role)),
			);
		},
		[selectedArtists, onChange],
	);

	return (
		<div className={cn("space-y-3", className)}>
			{/* 選択中のアーティストチップ */}
			{selectedArtists.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedArtists.map((artist) => (
						<div
							key={`${artist.role}-${artist.id}`}
							className="badge badge-accent gap-1 pr-1 transition-all hover:opacity-80"
						>
							<Users className="h-3 w-3" />
							<span className="max-w-[100px] truncate">
								{ROLE_LABELS[artist.role]}: {artist.name}
							</span>
							<button
								type="button"
								onClick={() => removeArtist(artist.id, artist.role)}
								className="ml-1 rounded-full p-0.5 transition-colors hover:bg-base-content/20"
								aria-label={`${artist.name}を削除`}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* 役割タブ */}
			<div className="flex flex-wrap gap-1">
				{SELECTABLE_ROLES.map((role) => {
					const count = roleCountMap.get(role) || 0;
					const isActive = role === activeRole;
					return (
						<button
							key={role}
							type="button"
							onClick={() => {
								setActiveRole(role);
								setIsDropdownOpen(true);
							}}
							className={cn(
								"btn btn-sm gap-1",
								isActive ? "btn-accent" : "btn-ghost",
							)}
						>
							{ROLE_LABELS[role]}
							{count > 0 && <span className="badge badge-sm">{count}</span>}
						</button>
					);
				})}
			</div>

			{/* アーティスト追加ボタン/ドロップダウン */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					className="btn btn-outline btn-sm gap-2"
				>
					<Plus className="h-4 w-4" />
					{ROLE_LABELS[activeRole]}を追加
				</button>

				{/* ドロップダウンパネル */}
				{isDropdownOpen && (
					<div className="absolute top-full left-0 z-50 mt-2 w-full max-w-md rounded-lg border border-base-300 bg-base-100 shadow-lg">
						{/* ヘッダー */}
						<div className="flex items-center justify-between border-base-300 border-b p-2">
							<span className="font-medium text-sm">
								{ROLE_LABELS[activeRole]}を選択
							</span>
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
									placeholder={`${ROLE_LABELS[activeRole]}を検索...`}
									className="input input-sm input-bordered w-full pl-9"
								/>
							</div>
						</div>

						{/* オプションリスト */}
						<div className="max-h-72 overflow-y-auto">
							{filteredOptions.length === 0 ? (
								<div className="p-4 text-center text-base-content/50">
									該当するアーティストがいません
								</div>
							) : (
								filteredOptions.map((artist) => {
									const isSelected = selectedIdsForRole.has(artist.id);
									return (
										<button
											key={artist.id}
											type="button"
											onClick={() => toggleArtist(artist)}
											className={cn(
												"flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-base-200",
												isSelected && "bg-accent/10 font-medium text-accent",
											)}
										>
											<div
												className={cn(
													"flex h-4 w-4 shrink-0 items-center justify-center rounded border",
													isSelected
														? "border-accent bg-accent text-accent-content"
														: "border-base-300",
												)}
											>
												{isSelected && <Check className="h-3 w-3" />}
											</div>
											<span>{artist.name}</span>
											{artist.nameJa && artist.nameJa !== artist.name && (
												<span className="text-base-content/50 text-sm">
													({artist.nameJa})
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
