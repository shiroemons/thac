import type { OfficialWorkCategory } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送して公式作品カテゴリ詳細を取得
export function getOfficialWorkCategory(
	code: string,
): Promise<OfficialWorkCategory> {
	return ssrFetch<OfficialWorkCategory>(
		`/api/admin/master/official-work-categories/${code}`,
	);
}
