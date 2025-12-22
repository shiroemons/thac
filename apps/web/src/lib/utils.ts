import { type ClassValue, clsx } from "clsx";
import { nanoid } from "nanoid";

export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

/**
 * ID生成ユーティリティ
 */
export const createId = {
	officialWorkLink: () => `wl_${nanoid()}`,
	officialSongLink: () => `sl_${nanoid()}`,
};

/**
 * 外部リンクを中間ページ経由のURLに変換
 */
export function getExternalLinkUrl(url: string): string {
	return `/go?url=${encodeURIComponent(url)}`;
}
