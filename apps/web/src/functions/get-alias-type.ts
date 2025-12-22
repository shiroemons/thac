import type { AliasType } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送して名義種別詳細を取得
export function getAliasType(code: string): Promise<AliasType> {
	return ssrFetch<AliasType>(`/api/admin/master/alias-types/${code}`);
}
