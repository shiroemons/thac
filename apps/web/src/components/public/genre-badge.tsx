import * as LucideIcons from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface GenreBadgeProps {
	code: string;
	name: string;
	color: string;
	icon?: string;
	className?: string;
}

/**
 * Hex color からRGB値を取得
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: Number.parseInt(result[1], 16),
				g: Number.parseInt(result[2], 16),
				b: Number.parseInt(result[3], 16),
			}
		: null;
}

/**
 * 色を白とブレンドして実際の表示色を計算
 * @param rgb 元の色
 * @param alpha 透過度（0-1）
 * @returns 白背景とブレンドした色
 */
function blendWithWhite(
	rgb: { r: number; g: number; b: number },
	alpha: number,
): { r: number; g: number; b: number } {
	return {
		r: Math.round(rgb.r * alpha + 255 * (1 - alpha)),
		g: Math.round(rgb.g * alpha + 255 * (1 - alpha)),
		b: Math.round(rgb.b * alpha + 255 * (1 - alpha)),
	};
}

/**
 * 背景色の明るさを判定し、テキスト色を決定
 * 20%透過の実際の表示色を考慮してWCAGコントラスト比を計算
 */
function getContrastColor(hexColor: string): string {
	const rgb = hexToRgb(hexColor);
	if (!rgb) return "inherit";

	// 20%透過で白背景とブレンドした実際の表示色を計算
	const blendedRgb = blendWithWhite(rgb, 0.2);

	// 相対輝度を計算（WCAG方式）
	const luminance =
		(0.299 * blendedRgb.r + 0.587 * blendedRgb.g + 0.114 * blendedRgb.b) / 255;

	// 白背景とのブレンドで明るくなるため、閾値を高めに設定
	return luminance > 0.75 ? "#1f2937" : "#374151";
}

/**
 * 値がReactコンポーネントかどうかを判定
 * forwardRefコンポーネントも含めて判定する
 */
function isReactComponent(
	value: unknown,
): value is React.ComponentType<{ className?: string }> {
	if (typeof value === "function") return true;
	// forwardRefコンポーネントはオブジェクトで$$typeofを持つ
	if (value && typeof value === "object" && "$$typeof" in value) return true;
	return false;
}

/**
 * Lucide icon名からコンポーネントを取得
 */
function getLucideIcon(
	iconName: string,
): React.ComponentType<{ className?: string }> | null {
	// kebab-case を PascalCase に変換
	const pascalCase = iconName
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon loading is intentional
	const IconComponent = LucideIcons[pascalCase as keyof typeof LucideIcons];
	// Reactコンポーネント（関数またはforwardRef）かどうかをチェック
	if (isReactComponent(IconComponent)) {
		return IconComponent;
	}
	return null;
}

/**
 * 公開画面用ジャンルバッジコンポーネント
 * 読み取り専用（削除ボタンなし）、smサイズのみ
 */
function GenreBadge({ code, name, color, icon, className }: GenreBadgeProps) {
	const IconComponent = icon ? getLucideIcon(icon) : null;
	const textColor = getContrastColor(color);

	return (
		<span
			data-slot="genre-badge"
			data-code={code}
			className={cn(
				"badge badge-sm inline-flex items-center gap-1 whitespace-nowrap text-xs",
				className,
			)}
			style={{
				backgroundColor: `${color}33`, // 20% opacity
				borderColor: `${color}66`, // 40% opacity for border
				color: textColor,
			}}
		>
			{IconComponent && <IconComponent className="size-3" />}
			<span>{name}</span>
		</span>
	);
}

export { GenreBadge };
export type { GenreBadgeProps };
