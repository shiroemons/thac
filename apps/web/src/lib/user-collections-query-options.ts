/**
 * ユーザーコレクション / お気に入り機能の TanStack Query ファクトリ
 *
 * GET 系はSSR対応の ssrFetch を使用し、ローダーでのプリフェッチも可能。
 * 書き込み系ミューテーションはキャッシュ無効化を自動で行う。
 *
 * @example
 * // ルートのloader
 * loader: ({ context }) =>
 *   context.queryClient.ensureQueryData(userCollectionsListQueryOptions())
 *
 * // コンポーネント
 * const { data } = useQuery(userCollectionsListQueryOptions())
 * const queryClient = useQueryClient();
 * const createMutation = useMutation(userCollectionMutations.create(queryClient));
 */
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { ssrFetch } from "@/functions/ssr-fetcher";
import type {
	CollectionItemAddInput,
	CollectionItemReorderInput,
	CollectionItemTargetType,
	LikeTarget,
	UserCollectionDetail,
	UserCollectionKind,
	UserCollectionListItem,
	UserCollectionUpdateInput,
} from "@/lib/api-client";
import { userCollectionsApi, userLikesApi } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-options";

// ===== クエリオプション =====

export function userCollectionsListQueryOptions(params?: {
	kind?: UserCollectionKind;
	target?: { type: CollectionItemTargetType; id: string };
	excludeDefaultLiked?: boolean;
}) {
	const searchParams = new URLSearchParams();
	if (params?.kind) searchParams.set("kind", params.kind);
	if (params?.target) {
		searchParams.set("targetType", params.target.type);
		searchParams.set("targetId", params.target.id);
	}
	if (params?.excludeDefaultLiked) {
		searchParams.set("excludeDefaultLiked", "true");
	}
	const query = searchParams.toString();
	const endpoint = query
		? `/api/user/collections?${query}`
		: "/api/user/collections";
	return queryOptions({
		queryKey: ["user", "collections", "list", params ?? null] as const,
		queryFn: () => ssrFetch<{ items: UserCollectionListItem[] }>(endpoint),
		staleTime: STALE_TIME.SHORT,
	});
}

export function userCollectionDetailQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["user", "collections", "detail", id] as const,
		queryFn: () =>
			ssrFetch<UserCollectionDetail>(`/api/user/collections/${id}`),
		staleTime: STALE_TIME.SHORT,
	});
}

export function userLikesCheckQueryOptions(
	items: Array<{
		targetType: "track" | "release" | "circle";
		targetId: string;
	}>,
) {
	const query = items.map((i) => `${i.targetType}:${i.targetId}`).join(",");
	return queryOptions({
		queryKey: ["user", "likes", "check", items] as const,
		queryFn: () =>
			ssrFetch<{
				results: Array<{
					targetType: "track" | "release" | "circle";
					targetId: string;
					liked: boolean;
				}>;
			}>(`/api/user/likes/check?items=${encodeURIComponent(query)}`),
		enabled: items.length > 0,
		staleTime: STALE_TIME.SHORT,
	});
}

// ===== ミューテーション =====

export const userCollectionMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (input: Parameters<typeof userCollectionsApi.create>[0]) =>
			userCollectionsApi.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "collections"] });
		},
	}),

	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: UserCollectionUpdateInput;
		}) => userCollectionsApi.update(id, input),
		onSuccess: (
			_data: UserCollectionListItem,
			variables: { id: string; input: UserCollectionUpdateInput },
		) => {
			queryClient.invalidateQueries({ queryKey: ["user", "collections"] });
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "detail", variables.id],
			});
		},
	}),

	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => userCollectionsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "collections"] });
		},
	}),

	addItem: (queryClient: QueryClient) => ({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: CollectionItemAddInput;
		}) => userCollectionsApi.addItem(id, input),
		onSuccess: (
			_data: unknown,
			variables: { id: string; input: CollectionItemAddInput },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "detail", variables.id],
			});
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "list"],
			});
			queryClient.invalidateQueries({ queryKey: ["user", "likes"] });
		},
	}),

	removeItem: (queryClient: QueryClient) => ({
		mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
			userCollectionsApi.removeItem(id, itemId),
		onSuccess: (_data: unknown, variables: { id: string; itemId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "detail", variables.id],
			});
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "list"],
			});
			queryClient.invalidateQueries({ queryKey: ["user", "likes"] });
		},
	}),

	reorderItems: (queryClient: QueryClient) => ({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: CollectionItemReorderInput;
		}) => userCollectionsApi.reorderItems(id, input),
		onSuccess: (
			_data: unknown,
			variables: { id: string; input: CollectionItemReorderInput },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["user", "collections", "detail", variables.id],
			});
		},
	}),
} as const;

export const userLikesMutations = {
	add: (queryClient: QueryClient) => ({
		mutationFn: (input: LikeTarget) => userLikesApi.add(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "likes"] });
			queryClient.invalidateQueries({ queryKey: ["user", "collections"] });
		},
	}),

	remove: (queryClient: QueryClient) => ({
		mutationFn: (input: LikeTarget) => userLikesApi.remove(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "likes"] });
			queryClient.invalidateQueries({ queryKey: ["user", "collections"] });
		},
	}),
} as const;
