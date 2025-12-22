import type { CircleWithLinks } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してサークル詳細を取得
export function getCircle(circleId: string): Promise<CircleWithLinks> {
	return ssrFetch<CircleWithLinks>(`/api/admin/circles/${circleId}`);
}
