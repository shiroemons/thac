import * as LucideIcons from "lucide-react";
import { Check } from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo } from "react";
import type { PublicGenreItem } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import type { SelectedGenre } from "./types";

interface GenreFilterProps {
	/** ジャンルマスターデータ一覧 */
	genreList: PublicGenreItem[];
	/** 選択中のジャンルリスト */
	selected: SelectedGenre[];
	/** 選択変更ハンドラ */
	onSelectionChange: (genres: SelectedGenre[]) => void;
	/** カスタムクラス名 */
	className?: string;
}

/**
 * 値がReactコンポーネントかどうかを判定
 */
function isReactComponent(
	value: unknown,
): value is React.ComponentType<{ className?: string }> {
	if (typeof value === "function") return true;
	if (value && typeof value === "object" && "$$typeof" in value) return true;
	return false;
}

/**
 * Lucide icon名からコンポーネントを取得
 */
function getLucideIcon(
	iconName: string,
): React.ComponentType<{ className?: string }> | null {
	const pascalCase = iconName
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon loading is intentional
	const IconComponent = LucideIcons[pascalCase as keyof typeof LucideIcons];
	if (isReactComponent(IconComponent)) {
		return IconComponent;
	}
	return null;
}

/**
 * ジャンル選択フィルター（複数選択対応）
 *
 * - ジャンルをバッジスタイルのボタンで表示
 * - 各ジャンルの色とアイコンを表示（既存のGenreBadgeスタイルに合わせる）
 * - クリックで選択/解除
 * - 選択中のジャンルはチェックマーク表示＋リングハイライト
 */
export function GenreFilter({
	genreList,
	selected,
	onSelectionChange,
	className,
}: GenreFilterProps) {
	// 選択中のジャンルコードセット
	const selectedCodes = useMemo(
		() => new Set((selected ?? []).map((g) => g.code)),
		[selected],
	);

	// ジャンルを選択/解除
	const toggleGenre = useCallback(
		(genre: PublicGenreItem) => {
			if (selectedCodes.has(genre.code)) {
				// 解除
				onSelectionChange(
					(selected ?? []).filter((g) => g.code !== genre.code),
				);
			} else {
				// 選択
				onSelectionChange([
					...(selected ?? []),
					{
						code: genre.code,
						name: genre.nameJa,
						color: genre.color,
					},
				]);
			}
		},
		[selectedCodes, selected, onSelectionChange],
	);

	return (
		<div className={cn("space-y-3", className)}>
			{/* ジャンルバッジボタングリッド */}
			<div className="flex flex-wrap gap-2">
				{(genreList ?? []).map((genre) => {
					const isSelected = selectedCodes.has(genre.code);
					const IconComponent = genre.icon ? getLucideIcon(genre.icon) : null;
					return (
						<button
							key={genre.code}
							type="button"
							onClick={() => toggleGenre(genre)}
							className={cn(
								"badge inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm transition-all",
								"hover:scale-105 hover:shadow-md",
								isSelected
									? "ring-2 ring-primary ring-offset-1 ring-offset-base-100"
									: "opacity-70 hover:opacity-100",
							)}
							style={{
								backgroundColor: `${genre.color}40`,
								borderColor: `${genre.color}80`,
								color: "var(--color-base-content)",
							}}
							title={genre.description || genre.nameJa}
							aria-pressed={isSelected}
						>
							{isSelected && <Check className="size-3.5" />}
							{!isSelected && IconComponent && (
								<IconComponent className="size-3.5" />
							)}
							<span>{genre.nameJa}</span>
						</button>
					);
				})}
			</div>

			{/* ジャンルが空の場合 */}
			{(genreList ?? []).length === 0 && (
				<div className="py-4 text-center text-base-content/50">
					ジャンルデータがありません
				</div>
			)}
		</div>
	);
}
