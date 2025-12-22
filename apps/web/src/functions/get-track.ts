import type { TrackDetail } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してトラック詳細を取得
export function getTrack(trackId: string): Promise<TrackDetail> {
	return ssrFetch<TrackDetail>(`/api/admin/tracks/${trackId}`);
}
