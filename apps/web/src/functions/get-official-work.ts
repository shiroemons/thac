import type { OfficialWork } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送して公式作品詳細を取得
export function getOfficialWork(workId: string): Promise<OfficialWork> {
	return ssrFetch<OfficialWork>(`/api/admin/official/works/${workId}`);
}
