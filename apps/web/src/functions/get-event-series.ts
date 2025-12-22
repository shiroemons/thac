import type { EventSeriesWithEvents } from "@/lib/api-client";
import { ssrFetch } from "./ssr-fetcher";

// SSR時にCookieを転送してイベントシリーズ詳細を取得
export function getEventSeries(
	eventSeriesId: string,
): Promise<EventSeriesWithEvents> {
	return ssrFetch<EventSeriesWithEvents>(
		`/api/admin/event-series/${eventSeriesId}`,
	);
}
