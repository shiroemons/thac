import type { OfficialSong } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送して公式楽曲詳細を取得
export function getOfficialSong(songId: string): Promise<OfficialSong> {
	return ssrFetch<OfficialSong>(`/api/admin/official/songs/${songId}`);
}
