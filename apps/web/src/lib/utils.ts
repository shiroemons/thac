import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

/**
 * 外部リンクを中間ページ経由のURLに変換
 */
export function getExternalLinkUrl(url: string): string {
	return `/go?url=${encodeURIComponent(url)}`;
}
