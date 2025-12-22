import type { ArtistWithAliases } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してアーティスト詳細を取得
export function getArtist(artistId: string): Promise<ArtistWithAliases> {
	return ssrFetch<ArtistWithAliases>(`/api/admin/artists/${artistId}`);
}
