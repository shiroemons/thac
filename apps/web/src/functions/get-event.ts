import type { EventWithDays } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してイベント詳細を取得
export function getEvent(eventId: string): Promise<EventWithDays> {
	return ssrFetch<EventWithDays>(`/api/admin/events/${eventId}`);
}
