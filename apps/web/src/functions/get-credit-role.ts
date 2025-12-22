import type { CreditRole } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してクレジット役割詳細を取得
export function getCreditRole(code: string): Promise<CreditRole> {
	return ssrFetch<CreditRole>(`/api/admin/master/credit-roles/${code}`);
}
