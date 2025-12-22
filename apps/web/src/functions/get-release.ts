import type { ReleaseWithDiscs } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してリリース詳細を取得
export function getRelease(releaseId: string): Promise<ReleaseWithDiscs> {
	return ssrFetch<ReleaseWithDiscs>(`/api/admin/releases/${releaseId}`);
}
