import type { Platform } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してプラットフォーム詳細を取得
export function getPlatform(code: string): Promise<Platform> {
	return ssrFetch<Platform>(`/api/admin/master/platforms/${code}`);
}
