import { queryOptions } from "@tanstack/react-query";
import type { PublicCollectionDetail } from "@/lib/public-api";
import { publicApi } from "@/lib/public-api";

export type { PublicCollectionDetail };

const STALE_TIME_COLLECTION = 60_000; // 1分

export function publicCollectionDetailQueryOptions(shortId: string) {
	return queryOptions({
		queryKey: ["public", "collections", "detail", shortId] as const,
		queryFn: (): Promise<PublicCollectionDetail> =>
			publicApi.collections.getByShortId(shortId),
		staleTime: STALE_TIME_COLLECTION,
	});
}
