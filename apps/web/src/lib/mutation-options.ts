/**
 * TanStack Query用のmutationOptionsファクトリ
 *
 * このファイルは、管理画面のCRUD操作で使用するmutationOptionsを提供する。
 * queryOptionsと同様のファクトリパターンを採用し、
 * 自動的なキャッシュ無効化（invalidation）を実現する。
 *
 * @example
 * // コンポーネントでの使用
 * const queryClient = useQueryClient();
 * const createArtist = useMutation(artistMutations.create(queryClient));
 *
 * // 実行
 * createArtist.mutate(data, {
 *   onSuccess: () => onOpenChange(false)
 * });
 */
import type { QueryClient } from "@tanstack/react-query";
import {
	type AliasType,
	type Artist,
	type ArtistAlias,
	type ArtistFullResponse,
	type ArtistWithAliases,
	albumRequestsApi,
	aliasTypesApi,
	artistAliasesApi,
	artistsApi,
	type Circle,
	type CircleFullResponse,
	type CircleLink,
	type CircleWithLinks,
	type CreditRole,
	circleLinksApi,
	circlesApi,
	creditRolesApi,
	type Disc,
	discsApi,
	type Event,
	type EventDay,
	type EventSeries,
	type EventSeriesWithEvents,
	type EventWithDays,
	eventDaysApi,
	eventSeriesApi,
	eventsApi,
	type Genre,
	genresApi,
	isConflictError,
	type OfficialSong,
	type OfficialWork,
	type OfficialWorkCategory,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
	type PaginatedResponse,
	type ParticipationType,
	type Platform,
	platformsApi,
	type Release,
	type ReleaseCircle,
	type ReleaseFullResponse,
	type ReleaseJanCode,
	type ReleasePublication,
	type ReleaseWithCounts,
	type ReleaseWithDiscs,
	releaseCirclesApi,
	releaseJanCodesApi,
	releasePublicationsApi,
	releasesApi,
	type Track,
	type TrackCredit,
	type TrackDerivation,
	type TrackDetail,
	type TrackIsrc,
	type TrackListItem,
	type TrackOfficialSong,
	type TrackPublication,
	type TrackWithCreditCount,
	trackCreditsApi,
	trackDerivationsApi,
	trackIsrcsApi,
	trackOfficialSongsApi,
	trackPublicationsApi,
	tracksApi,
} from "./api-client";

// ===== 共通型定義 =====

/** 一括削除の結果 */
export interface BatchDeleteResult {
	success: boolean;
	deleted: string[];
	failed: Array<{ id: string; error: string }>;
}

// ===== アーティスト =====

type CreateArtistData = Omit<Artist, "createdAt" | "updatedAt">;
type UpdateArtistData = Partial<
	Omit<Artist, "id" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const artistMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateArtistData) => artistsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["artists"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateArtistData }) =>
			artistsApi.update(id, data),

		onMutate: async (variables: { id: string; data: UpdateArtistData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["artists"] });
			await queryClient.cancelQueries({ queryKey: ["artist", variables.id] });

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousArtists = queryClient.getQueriesData<
				PaginatedResponse<Artist>
			>({ queryKey: ["artists"] });
			const previousDetail = queryClient.getQueryData<ArtistWithAliases>([
				"artist",
				variables.id,
			]);
			const previousFull = queryClient.getQueryData<ArtistFullResponse>([
				"artist",
				variables.id,
				"full",
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<ArtistWithAliases>(
					["artist", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// 統合データ
			if (previousFull) {
				queryClient.setQueryData<ArtistFullResponse>(
					["artist", variables.id, "full"],
					(old) =>
						old
							? { ...old, artist: { ...old.artist, ...variables.data } }
							: old,
				);
			}

			// リストデータ
			for (const [key, data] of previousArtists) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((a: Artist) =>
							a.id === variables.id ? { ...a, ...variables.data } : a,
						),
					});
				}
			}

			return { previousArtists, previousDetail, previousFull };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousArtists: [
							readonly unknown[],
							PaginatedResponse<Artist> | undefined,
						][];
						previousDetail: ArtistWithAliases | undefined;
						previousFull: ArtistFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousArtists) {
				for (const [key, data] of context.previousArtists) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["artist", variables.id],
					context.previousDetail,
				);
			}
			if (context?.previousFull) {
				queryClient.setQueryData(
					["artist", variables.id, "full"],
					context.previousFull,
				);
			}
		},

		onSettled: (
			_data: Artist | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["artists"] });
			queryClient.invalidateQueries({ queryKey: ["artist", variables.id] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => artistsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["artists"] });
		},
	}),
	batchDelete: (queryClient: QueryClient) => ({
		mutationFn: (ids: string[]) => artistsApi.batchDelete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["artists"] });
		},
	}),
};

// ===== アーティストエイリアス =====

type CreateArtistAliasData = Omit<
	ArtistAlias,
	"createdAt" | "updatedAt" | "artistName"
>;
type UpdateArtistAliasData = Partial<
	Omit<ArtistAlias, "id" | "createdAt" | "updatedAt" | "artistName">
> & { updatedAt?: string };

export const artistAliasMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateArtistAliasData) => artistAliasesApi.create(data),
		onSuccess: (_data: ArtistAlias, variables: CreateArtistAliasData) => {
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
			queryClient.invalidateQueries({
				queryKey: ["artist", variables.artistId],
			});
			queryClient.invalidateQueries({
				queryKey: ["artist", variables.artistId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			id,
			artistId: _artistId,
			data,
		}: {
			id: string;
			artistId: string;
			data: UpdateArtistAliasData;
		}) => artistAliasesApi.update(id, data),

		onMutate: async (variables: {
			id: string;
			artistId: string;
			data: UpdateArtistAliasData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["artistAliases"] });
			await queryClient.cancelQueries({
				queryKey: ["artistAlias", variables.id],
			});
			await queryClient.cancelQueries({
				queryKey: ["artist", variables.artistId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousAliases = queryClient.getQueriesData<
				PaginatedResponse<ArtistAlias>
			>({ queryKey: ["artistAliases"] });
			const previousDetail = queryClient.getQueryData<ArtistAlias>([
				"artistAlias",
				variables.id,
			]);
			const previousArtist = queryClient.getQueryData<ArtistWithAliases>([
				"artist",
				variables.artistId,
			]);
			const previousArtistFull = queryClient.getQueryData<ArtistFullResponse>([
				"artist",
				variables.artistId,
				"full",
			]);

			// 3. 楽観的更新
			// リストデータ
			for (const [key, data] of previousAliases) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((a: ArtistAlias) =>
							a.id === variables.id ? { ...a, ...variables.data } : a,
						),
					});
				}
			}

			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<ArtistAlias>(
					["artistAlias", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// 親アーティストの詳細データ
			if (previousArtist) {
				queryClient.setQueryData<ArtistWithAliases>(
					["artist", variables.artistId],
					(old) =>
						old
							? {
									...old,
									aliases: old.aliases.map((a) =>
										a.id === variables.id ? { ...a, ...variables.data } : a,
									),
								}
							: old,
				);
			}

			// 親アーティストの統合データ
			if (previousArtistFull) {
				queryClient.setQueryData<ArtistFullResponse>(
					["artist", variables.artistId, "full"],
					(old) =>
						old
							? {
									...old,
									artist: {
										...old.artist,
										aliases: old.artist.aliases.map((a) =>
											a.id === variables.id ? { ...a, ...variables.data } : a,
										),
									},
								}
							: old,
				);
			}

			return {
				previousAliases,
				previousDetail,
				previousArtist,
				previousArtistFull,
			};
		},

		onError: (
			err: unknown,
			variables: { id: string; artistId: string },
			context:
				| {
						previousAliases: [
							readonly unknown[],
							PaginatedResponse<ArtistAlias> | undefined,
						][];
						previousDetail: ArtistAlias | undefined;
						previousArtist: ArtistWithAliases | undefined;
						previousArtistFull: ArtistFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousAliases) {
				for (const [key, data] of context.previousAliases) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["artistAlias", variables.id],
					context.previousDetail,
				);
			}
			if (context?.previousArtist) {
				queryClient.setQueryData(
					["artist", variables.artistId],
					context.previousArtist,
				);
			}
			if (context?.previousArtistFull) {
				queryClient.setQueryData(
					["artist", variables.artistId, "full"],
					context.previousArtistFull,
				);
			}
		},

		onSettled: (
			_data: ArtistAlias | undefined,
			_error: unknown,
			variables: { id: string; artistId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
			queryClient.invalidateQueries({
				queryKey: ["artistAlias", variables.id],
			});
			queryClient.invalidateQueries({
				queryKey: ["artist", variables.artistId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => artistAliasesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
			// アーティスト詳細の無効化は呼び出し元で行う
		},
	}),
	batchDelete: (queryClient: QueryClient) => ({
		mutationFn: (ids: string[]) => artistAliasesApi.batchDelete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
		},
	}),
};

// ===== サークル =====

type CreateCircleData = Omit<Circle, "createdAt" | "updatedAt">;
type UpdateCircleData = Partial<
	Omit<Circle, "id" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const circleMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateCircleData) => circlesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["circles"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateCircleData }) =>
			circlesApi.update(id, data),

		onMutate: async (variables: { id: string; data: UpdateCircleData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["circles"] });
			await queryClient.cancelQueries({ queryKey: ["circle", variables.id] });

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousCircles = queryClient.getQueriesData<
				PaginatedResponse<Circle>
			>({ queryKey: ["circles"] });
			const previousDetail = queryClient.getQueryData<CircleWithLinks>([
				"circle",
				variables.id,
			]);
			const previousFull = queryClient.getQueryData<CircleFullResponse>([
				"circle",
				variables.id,
				"full",
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<CircleWithLinks>(
					["circle", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// 統合データ
			if (previousFull) {
				queryClient.setQueryData<CircleFullResponse>(
					["circle", variables.id, "full"],
					(old) =>
						old
							? { ...old, circle: { ...old.circle, ...variables.data } }
							: old,
				);
			}

			// リストデータ
			for (const [key, data] of previousCircles) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((c: Circle) =>
							c.id === variables.id ? { ...c, ...variables.data } : c,
						),
					});
				}
			}

			return { previousCircles, previousDetail, previousFull };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousCircles: [
							readonly unknown[],
							PaginatedResponse<Circle> | undefined,
						][];
						previousDetail: CircleWithLinks | undefined;
						previousFull: CircleFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousCircles) {
				for (const [key, data] of context.previousCircles) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["circle", variables.id],
					context.previousDetail,
				);
			}
			if (context?.previousFull) {
				queryClient.setQueryData(
					["circle", variables.id, "full"],
					context.previousFull,
				);
			}
		},

		onSettled: (
			_data: Circle | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["circles"] });
			queryClient.invalidateQueries({ queryKey: ["circle", variables.id] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => circlesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["circles"] });
		},
	}),
	batchDelete: (queryClient: QueryClient) => ({
		mutationFn: (ids: string[]) => circlesApi.batchDelete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["circles"] });
		},
	}),
};

// ===== サークルリンク =====

type CreateCircleLinkData = Omit<
	CircleLink,
	"circleId" | "createdAt" | "updatedAt" | "platformName"
>;
type UpdateCircleLinkData = Partial<
	Omit<
		CircleLink,
		"id" | "circleId" | "createdAt" | "updatedAt" | "platformName"
	>
>;

export const circleLinkMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			circleId,
			data,
		}: {
			circleId: string;
			data: CreateCircleLinkData;
		}) => circleLinksApi.create(circleId, data),
		onSuccess: (_data: CircleLink, variables: { circleId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId],
			});
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			circleId,
			linkId,
			data,
		}: {
			circleId: string;
			linkId: string;
			data: UpdateCircleLinkData;
		}) => circleLinksApi.update(circleId, linkId, data),

		onMutate: async (variables: {
			circleId: string;
			linkId: string;
			data: UpdateCircleLinkData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["circle", variables.circleId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousCircle = queryClient.getQueryData<CircleWithLinks>([
				"circle",
				variables.circleId,
			]);
			const previousCircleFull = queryClient.getQueryData<CircleFullResponse>([
				"circle",
				variables.circleId,
				"full",
			]);

			// 3. 楽観的更新
			// サークル詳細データ
			if (previousCircle) {
				queryClient.setQueryData<CircleWithLinks>(
					["circle", variables.circleId],
					(old) =>
						old
							? {
									...old,
									links: old.links.map((l) =>
										l.id === variables.linkId ? { ...l, ...variables.data } : l,
									),
								}
							: old,
				);
			}

			// サークル統合データ
			if (previousCircleFull) {
				queryClient.setQueryData<CircleFullResponse>(
					["circle", variables.circleId, "full"],
					(old) =>
						old
							? {
									...old,
									circle: {
										...old.circle,
										links: old.circle.links.map((l) =>
											l.id === variables.linkId
												? { ...l, ...variables.data }
												: l,
										),
									},
								}
							: old,
				);
			}

			return { previousCircle, previousCircleFull };
		},

		onError: (
			err: unknown,
			variables: { circleId: string; linkId: string },
			context:
				| {
						previousCircle: CircleWithLinks | undefined;
						previousCircleFull: CircleFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousCircle) {
				queryClient.setQueryData(
					["circle", variables.circleId],
					context.previousCircle,
				);
			}
			if (context?.previousCircleFull) {
				queryClient.setQueryData(
					["circle", variables.circleId, "full"],
					context.previousCircleFull,
				);
			}
		},

		onSettled: (
			_data: CircleLink | undefined,
			_error: unknown,
			variables: { circleId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({ circleId, linkId }: { circleId: string; linkId: string }) =>
			circleLinksApi.delete(circleId, linkId),
		onSuccess: (
			_data: { success: boolean },
			variables: { circleId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId],
			});
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId, "full"],
			});
		},
	}),
};

// ===== イベントシリーズ =====

type CreateEventSeriesData = Omit<EventSeries, "createdAt" | "updatedAt">;
type UpdateEventSeriesData = Partial<
	Omit<EventSeries, "id" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const eventSeriesMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateEventSeriesData) => eventSeriesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateEventSeriesData }) =>
			eventSeriesApi.update(id, data),

		onMutate: async (variables: {
			id: string;
			data: UpdateEventSeriesData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["eventSeries"] });
			await queryClient.cancelQueries({
				queryKey: ["eventSeries", variables.id],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousEventSeries = queryClient.getQueryData<EventSeries[]>([
				"eventSeries",
			]);
			const previousDetail = queryClient.getQueryData<EventSeriesWithEvents>([
				"eventSeries",
				variables.id,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<EventSeriesWithEvents>(
					["eventSeries", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			if (previousEventSeries) {
				queryClient.setQueryData<EventSeries[]>(["eventSeries"], (old) =>
					old
						? old.map((es) =>
								es.id === variables.id ? { ...es, ...variables.data } : es,
							)
						: old,
				);
			}

			return { previousEventSeries, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousEventSeries: EventSeries[] | undefined;
						previousDetail: EventSeriesWithEvents | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousEventSeries) {
				queryClient.setQueryData(["eventSeries"], context.previousEventSeries);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["eventSeries", variables.id],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: EventSeries | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
			queryClient.invalidateQueries({
				queryKey: ["eventSeries", variables.id],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => eventSeriesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
			eventSeriesApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
		},
	}),
};

// ===== イベント =====

type CreateEventData = Omit<Event, "createdAt" | "updatedAt" | "seriesName">;
type UpdateEventData = Partial<
	Omit<Event, "id" | "createdAt" | "updatedAt" | "seriesName">
> & {
	updatedAt?: string;
};

export const eventMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateEventData) => eventsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) =>
			eventsApi.update(id, data),

		onMutate: async (variables: { id: string; data: UpdateEventData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["events"] });
			await queryClient.cancelQueries({ queryKey: ["event", variables.id] });

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousEvents = queryClient.getQueriesData<
				PaginatedResponse<Event>
			>({ queryKey: ["events"] });
			const previousDetail = queryClient.getQueryData<EventWithDays>([
				"event",
				variables.id,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<EventWithDays>(
					["event", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			for (const [key, data] of previousEvents) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((e: Event) =>
							e.id === variables.id ? { ...e, ...variables.data } : e,
						),
					});
				}
			}

			return { previousEvents, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousEvents: [
							readonly unknown[],
							PaginatedResponse<Event> | undefined,
						][];
						previousDetail: EventWithDays | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousEvents) {
				for (const [key, data] of context.previousEvents) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["event", variables.id],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: Event | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["events"] });
			queryClient.invalidateQueries({ queryKey: ["event", variables.id] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => eventsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["events"] });
		},
	}),
};

// ===== イベント日程 =====

type CreateEventDayData = Omit<EventDay, "eventId" | "createdAt" | "updatedAt">;
type UpdateEventDayData = Partial<
	Omit<EventDay, "id" | "eventId" | "createdAt" | "updatedAt">
>;

export const eventDayMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			eventId,
			data,
		}: {
			eventId: string;
			data: CreateEventDayData;
		}) => eventDaysApi.create(eventId, data),
		onSuccess: (_data: EventDay, variables: { eventId: string }) => {
			queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			eventId,
			dayId,
			data,
		}: {
			eventId: string;
			dayId: string;
			data: UpdateEventDayData;
		}) => eventDaysApi.update(eventId, dayId, data),

		onMutate: async (variables: {
			eventId: string;
			dayId: string;
			data: UpdateEventDayData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["event", variables.eventId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousEvent = queryClient.getQueryData<EventWithDays>([
				"event",
				variables.eventId,
			]);

			// 3. 楽観的更新
			// イベント詳細データ（eventDaysはevent内に含まれる）
			if (previousEvent) {
				queryClient.setQueryData<EventWithDays>(
					["event", variables.eventId],
					(old) =>
						old
							? {
									...old,
									days: old.days.map((d) =>
										d.id === variables.dayId ? { ...d, ...variables.data } : d,
									),
								}
							: old,
				);
			}

			return { previousEvent };
		},

		onError: (
			err: unknown,
			variables: { eventId: string; dayId: string },
			context: { previousEvent: EventWithDays | undefined } | undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousEvent) {
				queryClient.setQueryData(
					["event", variables.eventId],
					context.previousEvent,
				);
			}
		},

		onSettled: (
			_data: EventDay | undefined,
			_error: unknown,
			variables: { eventId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["event", variables.eventId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({ eventId, dayId }: { eventId: string; dayId: string }) =>
			eventDaysApi.delete(eventId, dayId),
		onSuccess: (
			_data: { success: boolean },
			variables: { eventId: string },
		) => {
			queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
		},
	}),
};

// ===== 作品 =====

type CreateReleaseData = Omit<Release, "createdAt" | "updatedAt">;
type UpdateReleaseData = Partial<
	Omit<Release, "id" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const releaseMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateReleaseData) => releasesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["releases"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateReleaseData }) =>
			releasesApi.update(id, data),

		onMutate: async (variables: { id: string; data: UpdateReleaseData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["releases"] });
			await queryClient.cancelQueries({ queryKey: ["release", variables.id] });

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousReleases = queryClient.getQueriesData<
				PaginatedResponse<ReleaseWithCounts>
			>({ queryKey: ["releases"] });
			const previousDetail = queryClient.getQueryData<ReleaseWithDiscs>([
				"release",
				variables.id,
			]);
			const previousFull = queryClient.getQueryData<ReleaseFullResponse>([
				"release",
				variables.id,
				"full",
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<ReleaseWithDiscs>(
					["release", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// 統合データ
			if (previousFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.id, "full"],
					(old) =>
						old
							? { ...old, release: { ...old.release, ...variables.data } }
							: old,
				);
			}

			// リストデータ
			for (const [key, data] of previousReleases) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((r: ReleaseWithCounts) =>
							r.id === variables.id ? { ...r, ...variables.data } : r,
						),
					});
				}
			}

			return { previousReleases, previousDetail, previousFull };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousReleases: [
							readonly unknown[],
							PaginatedResponse<ReleaseWithCounts> | undefined,
						][];
						previousDetail: ReleaseWithDiscs | undefined;
						previousFull: ReleaseFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousReleases) {
				for (const [key, data] of context.previousReleases) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["release", variables.id],
					context.previousDetail,
				);
			}
			if (context?.previousFull) {
				queryClient.setQueryData(
					["release", variables.id, "full"],
					context.previousFull,
				);
			}
		},

		onSettled: (
			_data: Release | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["releases"] });
			queryClient.invalidateQueries({ queryKey: ["release", variables.id] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => releasesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["releases"] });
		},
	}),
	batchDelete: (queryClient: QueryClient) => ({
		mutationFn: (ids: string[]) => releasesApi.batchDelete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["releases"] });
		},
	}),
};

// ===== ディスク =====

type CreateDiscData = Omit<Disc, "releaseId" | "createdAt" | "updatedAt">;
type UpdateDiscData = Partial<
	Omit<Disc, "id" | "releaseId" | "createdAt" | "updatedAt">
>;

export const discMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			data,
		}: {
			releaseId: string;
			data: CreateDiscData;
		}) => discsApi.create(releaseId, data),
		onSuccess: (_data: Disc, variables: { releaseId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			discId,
			data,
		}: {
			releaseId: string;
			discId: string;
			data: UpdateDiscData;
		}) => discsApi.update(releaseId, discId, data),

		onMutate: async (variables: {
			releaseId: string;
			discId: string;
			data: UpdateDiscData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousRelease = queryClient.getQueryData<ReleaseWithDiscs>([
				"release",
				variables.releaseId,
			]);
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);

			// 3. 楽観的更新
			// 作品詳細データ
			if (previousRelease) {
				queryClient.setQueryData<ReleaseWithDiscs>(
					["release", variables.releaseId],
					(old) =>
						old
							? {
									...old,
									discs: old.discs.map((d) =>
										d.id === variables.discId ? { ...d, ...variables.data } : d,
									),
								}
							: old,
				);
			}

			// 作品統合データ
			if (previousReleaseFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.releaseId, "full"],
					(old) =>
						old
							? {
									...old,
									release: {
										...old.release,
										discs: old.release.discs.map((d) =>
											d.id === variables.discId
												? { ...d, ...variables.data }
												: d,
										),
									},
								}
							: old,
				);
			}

			return { previousRelease, previousReleaseFull };
		},

		onError: (
			err: unknown,
			variables: { releaseId: string; discId: string },
			context:
				| {
						previousRelease: ReleaseWithDiscs | undefined;
						previousReleaseFull: ReleaseFullResponse | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousRelease) {
				queryClient.setQueryData(
					["release", variables.releaseId],
					context.previousRelease,
				);
			}
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
		},

		onSettled: (
			_data: Disc | undefined,
			_error: unknown,
			variables: { releaseId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			discId,
		}: {
			releaseId: string;
			discId: string;
		}) => discsApi.delete(releaseId, discId),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
};

// ===== トラック =====

type CreateTrackData = Omit<Track, "releaseId" | "createdAt" | "updatedAt">;
type UpdateTrackData = Partial<
	Omit<Track, "id" | "releaseId" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const trackMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			data,
		}: {
			releaseId: string;
			data: CreateTrackData;
		}) => tracksApi.create(releaseId, data),
		onSuccess: (_data: Track, variables: { releaseId: string }) => {
			queryClient.invalidateQueries({ queryKey: ["tracks"] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "tracks"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
			data,
		}: {
			releaseId: string;
			trackId: string;
			data: UpdateTrackData;
		}) => tracksApi.update(releaseId, trackId, data),

		onMutate: async (variables: {
			releaseId: string;
			trackId: string;
			data: UpdateTrackData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["tracks"] });
			await queryClient.cancelQueries({
				queryKey: ["track", variables.trackId],
			});
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousTracks = queryClient.getQueriesData<
				PaginatedResponse<TrackListItem>
			>({ queryKey: ["tracks"] });
			const previousDetail = queryClient.getQueryData<TrackDetail>([
				"track",
				variables.trackId,
			]);
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);
			const previousReleaseTracks = queryClient.getQueryData<
				TrackWithCreditCount[]
			>(["release", variables.releaseId, "tracks"]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<TrackDetail>(
					["track", variables.trackId],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			for (const [key, data] of previousTracks) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((t: TrackListItem) =>
							t.id === variables.trackId ? { ...t, ...variables.data } : t,
						),
					});
				}
			}

			// 作品のトラック一覧
			if (previousReleaseTracks) {
				queryClient.setQueryData<TrackWithCreditCount[]>(
					["release", variables.releaseId, "tracks"],
					(old) =>
						old
							? old.map((t) =>
									t.id === variables.trackId ? { ...t, ...variables.data } : t,
								)
							: old,
				);
			}

			// 親作品の統合データ（トラック一覧を更新）
			if (previousReleaseFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.releaseId, "full"],
					(old) =>
						old
							? {
									...old,
									tracks: old.tracks.map((t) =>
										t.id === variables.trackId
											? { ...t, ...variables.data }
											: t,
									),
								}
							: old,
				);
			}

			return {
				previousTracks,
				previousDetail,
				previousReleaseFull,
				previousReleaseTracks,
			};
		},

		onError: (
			err: unknown,
			variables: { releaseId: string; trackId: string },
			context:
				| {
						previousTracks: [
							readonly unknown[],
							PaginatedResponse<TrackListItem> | undefined,
						][];
						previousDetail: TrackDetail | undefined;
						previousReleaseFull: ReleaseFullResponse | undefined;
						previousReleaseTracks: TrackWithCreditCount[] | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousTracks) {
				for (const [key, data] of context.previousTracks) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["track", variables.trackId],
					context.previousDetail,
				);
			}
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
			if (context?.previousReleaseTracks) {
				queryClient.setQueryData(
					["release", variables.releaseId, "tracks"],
					context.previousReleaseTracks,
				);
			}
		},

		onSettled: (
			_data: Track | undefined,
			_error: unknown,
			variables: { releaseId: string; trackId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["tracks"] });
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "tracks"],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
		}: {
			releaseId: string;
			trackId: string;
		}) => tracksApi.delete(releaseId, trackId),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({ queryKey: ["tracks"] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "tracks"],
			});
		},
	}),
	batchDelete: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ trackId: string; releaseId: string }>) =>
			tracksApi.batchDelete(items),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["tracks"] });
			queryClient.invalidateQueries({ queryKey: ["releases"] });
			queryClient.invalidateQueries({ queryKey: ["release"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
			direction,
		}: {
			releaseId: string;
			trackId: string;
			direction: "up" | "down";
		}) => tracksApi.reorder(releaseId, trackId, direction),
		onSuccess: (_data: Track[], variables: { releaseId: string }) => {
			queryClient.invalidateQueries({ queryKey: ["tracks"] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "tracks"],
			});
		},
	}),
};

// ===== 公式作品 =====

type CreateOfficialWorkData = Omit<OfficialWork, "createdAt" | "updatedAt">;
type UpdateOfficialWorkData = Partial<
	Omit<OfficialWork, "id" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const officialWorkMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateOfficialWorkData) => officialWorksApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorks"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateOfficialWorkData }) =>
			officialWorksApi.update(id, data),

		onMutate: async (variables: {
			id: string;
			data: UpdateOfficialWorkData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["officialWorks"] });
			await queryClient.cancelQueries({
				queryKey: ["officialWork", variables.id],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousOfficialWorks = queryClient.getQueriesData<
				PaginatedResponse<OfficialWork>
			>({ queryKey: ["officialWorks"] });
			const previousDetail = queryClient.getQueryData<OfficialWork>([
				"officialWork",
				variables.id,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<OfficialWork>(
					["officialWork", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			for (const [key, data] of previousOfficialWorks) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((ow: OfficialWork) =>
							ow.id === variables.id ? { ...ow, ...variables.data } : ow,
						),
					});
				}
			}

			return { previousOfficialWorks, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousOfficialWorks: [
							readonly unknown[],
							PaginatedResponse<OfficialWork> | undefined,
						][];
						previousDetail: OfficialWork | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousOfficialWorks) {
				for (const [key, data] of context.previousOfficialWorks) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["officialWork", variables.id],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: OfficialWork | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["officialWorks"] });
			queryClient.invalidateQueries({
				queryKey: ["officialWork", variables.id],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => officialWorksApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorks"] });
		},
	}),
};

// ===== 公式楽曲 =====

type CreateOfficialSongData = Omit<
	OfficialSong,
	"createdAt" | "updatedAt" | "workName"
>;
type UpdateOfficialSongData = Partial<
	Omit<OfficialSong, "id" | "createdAt" | "updatedAt" | "workName">
> & { updatedAt?: string };

export const officialSongMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateOfficialSongData) => officialSongsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ id, data }: { id: string; data: UpdateOfficialSongData }) =>
			officialSongsApi.update(id, data),

		onMutate: async (variables: {
			id: string;
			data: UpdateOfficialSongData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["officialSongs"] });
			await queryClient.cancelQueries({
				queryKey: ["officialSong", variables.id],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousOfficialSongs = queryClient.getQueriesData<
				PaginatedResponse<OfficialSong>
			>({ queryKey: ["officialSongs"] });
			const previousDetail = queryClient.getQueryData<OfficialSong>([
				"officialSong",
				variables.id,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<OfficialSong>(
					["officialSong", variables.id],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			for (const [key, data] of previousOfficialSongs) {
				if (
					data &&
					typeof data === "object" &&
					"data" in data &&
					Array.isArray(data.data)
				) {
					queryClient.setQueryData(key, {
						...data,
						data: data.data.map((os: OfficialSong) =>
							os.id === variables.id ? { ...os, ...variables.data } : os,
						),
					});
				}
			}

			return { previousOfficialSongs, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { id: string },
			context:
				| {
						previousOfficialSongs: [
							readonly unknown[],
							PaginatedResponse<OfficialSong> | undefined,
						][];
						previousDetail: OfficialSong | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousOfficialSongs) {
				for (const [key, data] of context.previousOfficialSongs) {
					queryClient.setQueryData(key, data);
				}
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["officialSong", variables.id],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: OfficialSong | undefined,
			_error: unknown,
			variables: { id: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
			queryClient.invalidateQueries({
				queryKey: ["officialSong", variables.id],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (id: string) => officialSongsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
		},
	}),
};

// ===== マスターデータ: プラットフォーム =====

type CreatePlatformData = Omit<Platform, "createdAt" | "updatedAt">;
type UpdatePlatformData = Partial<
	Omit<Platform, "code" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const platformMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreatePlatformData) => platformsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ code, data }: { code: string; data: UpdatePlatformData }) =>
			platformsApi.update(code, data),

		onMutate: async (variables: { code: string; data: UpdatePlatformData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["platforms"] });
			await queryClient.cancelQueries({
				queryKey: ["platform", variables.code],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousPlatforms = queryClient.getQueryData<Platform[]>([
				"platforms",
			]);
			const previousDetail = queryClient.getQueryData<Platform>([
				"platform",
				variables.code,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<Platform>(
					["platform", variables.code],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			if (previousPlatforms) {
				queryClient.setQueryData<Platform[]>(["platforms"], (old) =>
					old
						? old.map((p) =>
								p.code === variables.code ? { ...p, ...variables.data } : p,
							)
						: old,
				);
			}

			return { previousPlatforms, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { code: string },
			context:
				| {
						previousPlatforms: Platform[] | undefined;
						previousDetail: Platform | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousPlatforms) {
				queryClient.setQueryData(["platforms"], context.previousPlatforms);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["platform", variables.code],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: Platform | undefined,
			_error: unknown,
			variables: { code: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
			queryClient.invalidateQueries({ queryKey: ["platform", variables.code] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (code: string) => platformsApi.delete(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			platformsApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
		},
	}),
};

// ===== マスターデータ: ジャンル =====

type CreateGenreData = Omit<Genre, "createdAt" | "updatedAt">;
type UpdateGenreData = Partial<
	Omit<Genre, "code" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const genreMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateGenreData) => genresApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["genres"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ code, data }: { code: string; data: UpdateGenreData }) =>
			genresApi.update(code, data),

		onMutate: async (variables: { code: string; data: UpdateGenreData }) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["genres"] });
			await queryClient.cancelQueries({
				queryKey: ["genre", variables.code],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousGenres = queryClient.getQueryData<Genre[]>(["genres"]);
			const previousDetail = queryClient.getQueryData<Genre>([
				"genre",
				variables.code,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<Genre>(["genre", variables.code], (old) =>
					old ? { ...old, ...variables.data } : old,
				);
			}

			// リストデータ
			if (previousGenres) {
				queryClient.setQueryData<Genre[]>(["genres"], (old) =>
					old
						? old.map((g) =>
								g.code === variables.code ? { ...g, ...variables.data } : g,
							)
						: old,
				);
			}

			return { previousGenres, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { code: string },
			context:
				| {
						previousGenres: Genre[] | undefined;
						previousDetail: Genre | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousGenres) {
				queryClient.setQueryData(["genres"], context.previousGenres);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["genre", variables.code],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: Genre | undefined,
			_error: unknown,
			variables: { code: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["genres"] });
			queryClient.invalidateQueries({ queryKey: ["genre", variables.code] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (code: string) => genresApi.delete(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["genres"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			genresApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["genres"] });
		},
	}),
};

// ===== マスターデータ: 名義種別 =====

type CreateAliasTypeData = Omit<
	AliasType,
	"createdAt" | "updatedAt" | "sortOrder"
> & {
	sortOrder?: number;
};
type UpdateAliasTypeData = Partial<
	Omit<AliasType, "code" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const aliasTypeMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateAliasTypeData) => aliasTypesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({ code, data }: { code: string; data: UpdateAliasTypeData }) =>
			aliasTypesApi.update(code, data),

		onMutate: async (variables: {
			code: string;
			data: UpdateAliasTypeData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["aliasTypes"] });
			await queryClient.cancelQueries({
				queryKey: ["aliasType", variables.code],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousAliasTypes = queryClient.getQueryData<AliasType[]>([
				"aliasTypes",
			]);
			const previousDetail = queryClient.getQueryData<AliasType>([
				"aliasType",
				variables.code,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<AliasType>(
					["aliasType", variables.code],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			if (previousAliasTypes) {
				queryClient.setQueryData<AliasType[]>(["aliasTypes"], (old) =>
					old
						? old.map((a) =>
								a.code === variables.code ? { ...a, ...variables.data } : a,
							)
						: old,
				);
			}

			return { previousAliasTypes, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { code: string },
			context:
				| {
						previousAliasTypes: AliasType[] | undefined;
						previousDetail: AliasType | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousAliasTypes) {
				queryClient.setQueryData(["aliasTypes"], context.previousAliasTypes);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["aliasType", variables.code],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: AliasType | undefined,
			_error: unknown,
			variables: { code: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
			queryClient.invalidateQueries({
				queryKey: ["aliasType", variables.code],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (code: string) => aliasTypesApi.delete(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			aliasTypesApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
		},
	}),
};

// ===== マスターデータ: クレジット役割 =====

type CreateCreditRoleData = Omit<
	CreditRole,
	"createdAt" | "updatedAt" | "sortOrder"
> & {
	sortOrder?: number;
};
type UpdateCreditRoleData = Partial<
	Omit<CreditRole, "code" | "createdAt" | "updatedAt">
> & {
	updatedAt?: string;
};

export const creditRoleMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateCreditRoleData) => creditRolesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			code,
			data,
		}: {
			code: string;
			data: UpdateCreditRoleData;
		}) => creditRolesApi.update(code, data),

		onMutate: async (variables: {
			code: string;
			data: UpdateCreditRoleData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["creditRoles"] });
			await queryClient.cancelQueries({
				queryKey: ["creditRole", variables.code],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousCreditRoles = queryClient.getQueryData<CreditRole[]>([
				"creditRoles",
			]);
			const previousDetail = queryClient.getQueryData<CreditRole>([
				"creditRole",
				variables.code,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<CreditRole>(
					["creditRole", variables.code],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			if (previousCreditRoles) {
				queryClient.setQueryData<CreditRole[]>(["creditRoles"], (old) =>
					old
						? old.map((c) =>
								c.code === variables.code ? { ...c, ...variables.data } : c,
							)
						: old,
				);
			}

			return { previousCreditRoles, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { code: string },
			context:
				| {
						previousCreditRoles: CreditRole[] | undefined;
						previousDetail: CreditRole | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousCreditRoles) {
				queryClient.setQueryData(["creditRoles"], context.previousCreditRoles);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["creditRole", variables.code],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: CreditRole | undefined,
			_error: unknown,
			variables: { code: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
			queryClient.invalidateQueries({
				queryKey: ["creditRole", variables.code],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (code: string) => creditRolesApi.delete(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			creditRolesApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
		},
	}),
};

// ===== マスターデータ: 公式作品カテゴリ =====

type CreateOfficialWorkCategoryData = Omit<
	OfficialWorkCategory,
	"createdAt" | "updatedAt" | "sortOrder"
> & {
	sortOrder?: number;
};
type UpdateOfficialWorkCategoryData = Partial<
	Omit<OfficialWorkCategory, "code" | "createdAt" | "updatedAt">
> & { updatedAt?: string };

export const officialWorkCategoryMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (data: CreateOfficialWorkCategoryData) =>
			officialWorkCategoriesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			code,
			data,
		}: {
			code: string;
			data: UpdateOfficialWorkCategoryData;
		}) => officialWorkCategoriesApi.update(code, data),

		onMutate: async (variables: {
			code: string;
			data: UpdateOfficialWorkCategoryData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({ queryKey: ["officialWorkCategories"] });
			await queryClient.cancelQueries({
				queryKey: ["officialWorkCategory", variables.code],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousCategories = queryClient.getQueryData<
				OfficialWorkCategory[]
			>(["officialWorkCategories"]);
			const previousDetail = queryClient.getQueryData<OfficialWorkCategory>([
				"officialWorkCategory",
				variables.code,
			]);

			// 3. 楽観的更新
			// 詳細データ
			if (previousDetail) {
				queryClient.setQueryData<OfficialWorkCategory>(
					["officialWorkCategory", variables.code],
					(old) => (old ? { ...old, ...variables.data } : old),
				);
			}

			// リストデータ
			if (previousCategories) {
				queryClient.setQueryData<OfficialWorkCategory[]>(
					["officialWorkCategories"],
					(old) =>
						old
							? old.map((c) =>
									c.code === variables.code ? { ...c, ...variables.data } : c,
								)
							: old,
				);
			}

			return { previousCategories, previousDetail };
		},

		onError: (
			err: unknown,
			variables: { code: string },
			context:
				| {
						previousCategories: OfficialWorkCategory[] | undefined;
						previousDetail: OfficialWorkCategory | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousCategories) {
				queryClient.setQueryData(
					["officialWorkCategories"],
					context.previousCategories,
				);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					["officialWorkCategory", variables.code],
					context.previousDetail,
				);
			}
		},

		onSettled: (
			_data: OfficialWorkCategory | undefined,
			_error: unknown,
			variables: { code: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
			queryClient.invalidateQueries({
				queryKey: ["officialWorkCategory", variables.code],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: (code: string) => officialWorkCategoriesApi.delete(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			officialWorkCategoriesApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
		},
	}),
};

// ===== 作品サークル（作品とサークルの関連付け） =====

type AddReleaseCircleData = {
	circleId: string;
	participationType?: ParticipationType;
	position?: number;
};
type UpdateReleaseCircleData = {
	participationType?: ParticipationType;
	position?: number;
};

export const releaseCircleMutations = {
	add: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			data,
		}: {
			releaseId: string;
			data: AddReleaseCircleData;
		}) => releaseCirclesApi.add(releaseId, data),
		onSuccess: (_data: ReleaseCircle, variables: { releaseId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			circleId,
			participationType,
			data,
		}: {
			releaseId: string;
			circleId: string;
			participationType: ParticipationType;
			data: UpdateReleaseCircleData;
		}) =>
			releaseCirclesApi.update(releaseId, circleId, participationType, data),

		onMutate: async (variables: {
			releaseId: string;
			circleId: string;
			participationType: ParticipationType;
			data: UpdateReleaseCircleData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			await queryClient.cancelQueries({
				queryKey: ["release-circles", variables.releaseId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);

			// 3. 楽観的更新
			if (previousReleaseFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.releaseId, "full"],
					(old) =>
						old
							? {
									...old,
									circles: old.circles.map((c) =>
										c.circleId === variables.circleId &&
										c.participationType === variables.participationType
											? { ...c, ...variables.data }
											: c,
									),
								}
							: old,
				);
			}

			return { previousReleaseFull };
		},

		onError: (
			err: unknown,
			variables: { releaseId: string },
			context:
				| { previousReleaseFull: ReleaseFullResponse | undefined }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
		},

		onSettled: (
			_data: ReleaseCircle | undefined,
			_error: unknown,
			variables: { releaseId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release-circles", variables.releaseId],
			});
		},
	}),
	remove: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			circleId,
			participationType,
		}: {
			releaseId: string;
			circleId: string;
			participationType: ParticipationType;
		}) => releaseCirclesApi.remove(releaseId, circleId, participationType),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
};

// ===== 作品公開リンク =====

type CreateReleasePublicationData = {
	id: string;
	platformCode: string;
	url: string;
};
type UpdateReleasePublicationData = {
	url?: string;
};

export const releasePublicationMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			data,
		}: {
			releaseId: string;
			data: CreateReleasePublicationData;
		}) => releasePublicationsApi.create(releaseId, data),
		onSuccess: (
			_data: ReleasePublication,
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			publicationId,
			data,
		}: {
			releaseId: string;
			publicationId: string;
			data: UpdateReleasePublicationData;
		}) => releasePublicationsApi.update(releaseId, publicationId, data),

		onMutate: async (variables: {
			releaseId: string;
			publicationId: string;
			data: UpdateReleasePublicationData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			await queryClient.cancelQueries({
				queryKey: ["release-publications", variables.releaseId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);

			// 3. 楽観的更新
			if (previousReleaseFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.releaseId, "full"],
					(old) =>
						old
							? {
									...old,
									publications: old.publications.map((p) =>
										p.id === variables.publicationId
											? { ...p, ...variables.data }
											: p,
									),
								}
							: old,
				);
			}

			return { previousReleaseFull };
		},

		onError: (
			err: unknown,
			variables: { releaseId: string },
			context:
				| { previousReleaseFull: ReleaseFullResponse | undefined }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
		},

		onSettled: (
			_data: ReleasePublication | undefined,
			_error: unknown,
			variables: { releaseId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release-publications", variables.releaseId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			publicationId,
		}: {
			releaseId: string;
			publicationId: string;
		}) => releasePublicationsApi.delete(releaseId, publicationId),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
};

// ===== 作品JANコード =====

type CreateReleaseJanCodeData = {
	id: string;
	janCode: string;
	label?: string | null;
	isPrimary?: boolean;
	countryCode?: string | null;
};
type UpdateReleaseJanCodeData = {
	label?: string | null;
	isPrimary?: boolean;
	countryCode?: string | null;
};

export const releaseJanCodeMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			data,
		}: {
			releaseId: string;
			data: CreateReleaseJanCodeData;
		}) => releaseJanCodesApi.create(releaseId, data),
		onSuccess: (_data: ReleaseJanCode, variables: { releaseId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			janCodeId,
			data,
		}: {
			releaseId: string;
			janCodeId: string;
			data: UpdateReleaseJanCodeData;
		}) => releaseJanCodesApi.update(releaseId, janCodeId, data),

		onMutate: async (variables: {
			releaseId: string;
			janCodeId: string;
			data: UpdateReleaseJanCodeData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			await queryClient.cancelQueries({
				queryKey: ["release-jan-codes", variables.releaseId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);

			// 3. 楽観的更新
			if (previousReleaseFull) {
				queryClient.setQueryData<ReleaseFullResponse>(
					["release", variables.releaseId, "full"],
					(old) =>
						old
							? {
									...old,
									janCodes: old.janCodes.map((j) =>
										j.id === variables.janCodeId
											? { ...j, ...variables.data }
											: j,
									),
								}
							: old,
				);
			}

			return { previousReleaseFull };
		},

		onError: (
			err: unknown,
			variables: { releaseId: string },
			context:
				| { previousReleaseFull: ReleaseFullResponse | undefined }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
		},

		onSettled: (
			_data: ReleaseJanCode | undefined,
			_error: unknown,
			variables: { releaseId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			queryClient.invalidateQueries({
				queryKey: ["release-jan-codes", variables.releaseId],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			janCodeId,
		}: {
			releaseId: string;
			janCodeId: string;
		}) => releaseJanCodesApi.delete(releaseId, janCodeId),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
};

// ===== トラッククレジット =====

type CreateTrackCreditData = {
	id: string;
	artistId: string;
	creditName: string;
	aliasTypeCode?: string | null;
	creditPosition?: number | null;
	artistAliasId?: string | null;
	rolesCodes?: string[];
};
type UpdateTrackCreditData = {
	artistId?: string;
	creditName?: string;
	aliasTypeCode?: string | null;
	creditPosition?: number | null;
	artistAliasId?: string | null;
	rolesCodes?: string[];
};

export const trackCreditMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
			data,
		}: {
			releaseId: string;
			trackId: string;
			data: CreateTrackCreditData;
		}) => trackCreditsApi.create(releaseId, trackId, data),
		onSuccess: (
			_data: TrackCredit,
			variables: { releaseId: string; trackId: string },
		) => {
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
			creditId,
			data,
		}: {
			releaseId: string;
			trackId: string;
			creditId: string;
			data: UpdateTrackCreditData;
		}) => trackCreditsApi.update(releaseId, trackId, creditId, data),

		onMutate: async (variables: {
			releaseId: string;
			trackId: string;
			creditId: string;
			data: UpdateTrackCreditData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
			await queryClient.cancelQueries({
				queryKey: ["track", variables.trackId],
			});
			await queryClient.cancelQueries({
				queryKey: ["track-credits", variables.trackId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousReleaseFull = queryClient.getQueryData<ReleaseFullResponse>(
				["release", variables.releaseId, "full"],
			);
			const previousTrack = queryClient.getQueryData<TrackDetail>([
				"track",
				variables.trackId,
			]);

			// 3. 楽観的更新
			// トラック詳細データ
			if (previousTrack) {
				queryClient.setQueryData<TrackDetail>(
					["track", variables.trackId],
					(old) =>
						old
							? {
									...old,
									credits: old.credits.map((c) =>
										c.id === variables.creditId
											? { ...c, ...variables.data }
											: c,
									),
								}
							: old,
				);
			}

			return { previousReleaseFull, previousTrack };
		},

		onError: (
			err: unknown,
			variables: { releaseId: string; trackId: string },
			context:
				| {
						previousReleaseFull: ReleaseFullResponse | undefined;
						previousTrack: TrackDetail | undefined;
				  }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousReleaseFull) {
				queryClient.setQueryData(
					["release", variables.releaseId, "full"],
					context.previousReleaseFull,
				);
			}
			if (context?.previousTrack) {
				queryClient.setQueryData(
					["track", variables.trackId],
					context.previousTrack,
				);
			}
		},

		onSettled: (
			_data: TrackCredit | undefined,
			_error: unknown,
			variables: { releaseId: string; trackId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
			queryClient.invalidateQueries({
				queryKey: ["track-credits", variables.trackId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			releaseId,
			trackId,
			creditId,
		}: {
			releaseId: string;
			trackId: string;
			creditId: string;
		}) => trackCreditsApi.delete(releaseId, trackId, creditId),
		onSuccess: (
			_data: { success: boolean },
			variables: { releaseId: string; trackId: string },
		) => {
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
			});
		},
	}),
};

// ===== トラック公式楽曲 =====

type CreateTrackOfficialSongData = {
	id: string;
	officialSongId?: string | null;
	customSongName?: string | null;
	partPosition?: number | null;
	startSecond?: number | null;
	endSecond?: number | null;
	notes?: string | null;
};
type UpdateTrackOfficialSongData = {
	partPosition?: number | null;
	startSecond?: number | null;
	endSecond?: number | null;
	notes?: string | null;
};

export const trackOfficialSongMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			data,
		}: {
			trackId: string;
			data: CreateTrackOfficialSongData;
		}) => trackOfficialSongsApi.create(trackId, data),
		onSuccess: (_data: TrackOfficialSong, variables: { trackId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["track-official-songs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			officialSongId,
			data,
		}: {
			trackId: string;
			officialSongId: string;
			data: UpdateTrackOfficialSongData;
		}) => trackOfficialSongsApi.update(trackId, officialSongId, data),

		onMutate: async (variables: {
			trackId: string;
			officialSongId: string;
			data: UpdateTrackOfficialSongData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["track-official-songs", variables.trackId],
			});
			await queryClient.cancelQueries({
				queryKey: ["track", variables.trackId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousOfficialSongs = queryClient.getQueryData<
				TrackOfficialSong[]
			>(["track-official-songs", variables.trackId]);

			// 3. 楽観的更新
			if (previousOfficialSongs) {
				queryClient.setQueryData<TrackOfficialSong[]>(
					["track-official-songs", variables.trackId],
					(old) =>
						old
							? old.map((os) =>
									os.id === variables.officialSongId
										? { ...os, ...variables.data }
										: os,
								)
							: old,
				);
			}

			return { previousOfficialSongs };
		},

		onError: (
			err: unknown,
			variables: { trackId: string },
			context:
				| { previousOfficialSongs: TrackOfficialSong[] | undefined }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousOfficialSongs) {
				queryClient.setQueryData(
					["track-official-songs", variables.trackId],
					context.previousOfficialSongs,
				);
			}
		},

		onSettled: (
			_data: TrackOfficialSong | undefined,
			_error: unknown,
			variables: { trackId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["track-official-songs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			officialSongId,
		}: {
			trackId: string;
			officialSongId: string;
		}) => trackOfficialSongsApi.delete(trackId, officialSongId),
		onSuccess: (
			_data: { success: boolean },
			variables: { trackId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["track-official-songs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	reorder: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			officialSongId,
			direction,
		}: {
			trackId: string;
			officialSongId: string;
			direction: "up" | "down";
		}) => trackOfficialSongsApi.reorder(trackId, officialSongId, direction),
		onSuccess: (_data: TrackOfficialSong[], variables: { trackId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["track-official-songs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
};

// ===== トラック派生関係 =====

type CreateTrackDerivationData = {
	id: string;
	parentTrackId: string;
	notes?: string | null;
};

export const trackDerivationMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			data,
		}: {
			trackId: string;
			data: CreateTrackDerivationData;
		}) => trackDerivationsApi.create(trackId, data),
		onSuccess: (_data: TrackDerivation, variables: { trackId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["track-derivations", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			derivationId,
		}: {
			trackId: string;
			derivationId: string;
		}) => trackDerivationsApi.delete(trackId, derivationId),
		onSuccess: (
			_data: { success: boolean },
			variables: { trackId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["track-derivations", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
};

// ===== トラック公開リンク =====

type CreateTrackPublicationData = {
	id: string;
	platformCode: string;
	url: string;
};
type UpdateTrackPublicationData = {
	url?: string;
};

export const trackPublicationMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			data,
		}: {
			trackId: string;
			data: CreateTrackPublicationData;
		}) => trackPublicationsApi.create(trackId, data),
		onSuccess: (_data: TrackPublication, variables: { trackId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["track-publications", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			publicationId,
			data,
		}: {
			trackId: string;
			publicationId: string;
			data: UpdateTrackPublicationData;
		}) => trackPublicationsApi.update(trackId, publicationId, data),

		onMutate: async (variables: {
			trackId: string;
			publicationId: string;
			data: UpdateTrackPublicationData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["track-publications", variables.trackId],
			});
			await queryClient.cancelQueries({
				queryKey: ["track", variables.trackId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousPublications = queryClient.getQueryData<TrackPublication[]>(
				["track-publications", variables.trackId],
			);

			// 3. 楽観的更新
			if (previousPublications) {
				queryClient.setQueryData<TrackPublication[]>(
					["track-publications", variables.trackId],
					(old) =>
						old
							? old.map((p) =>
									p.id === variables.publicationId
										? { ...p, ...variables.data }
										: p,
								)
							: old,
				);
			}

			return { previousPublications };
		},

		onError: (
			err: unknown,
			variables: { trackId: string },
			context:
				| { previousPublications: TrackPublication[] | undefined }
				| undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousPublications) {
				queryClient.setQueryData(
					["track-publications", variables.trackId],
					context.previousPublications,
				);
			}
		},

		onSettled: (
			_data: TrackPublication | undefined,
			_error: unknown,
			variables: { trackId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["track-publications", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			publicationId,
		}: {
			trackId: string;
			publicationId: string;
		}) => trackPublicationsApi.delete(trackId, publicationId),
		onSuccess: (
			_data: { success: boolean },
			variables: { trackId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["track-publications", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
};

// ===== トラックISRC =====

type CreateTrackIsrcData = {
	id: string;
	isrc: string;
	isPrimary?: boolean;
};
type UpdateTrackIsrcData = {
	isPrimary?: boolean;
};

export const trackIsrcMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			data,
		}: {
			trackId: string;
			data: CreateTrackIsrcData;
		}) => trackIsrcsApi.create(trackId, data),
		onSuccess: (_data: TrackIsrc, variables: { trackId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["track-isrcs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	update: (queryClient: QueryClient) => ({
		mutationFn: ({
			trackId,
			isrcId,
			data,
		}: {
			trackId: string;
			isrcId: string;
			data: UpdateTrackIsrcData;
		}) => trackIsrcsApi.update(trackId, isrcId, data),

		onMutate: async (variables: {
			trackId: string;
			isrcId: string;
			data: UpdateTrackIsrcData;
		}) => {
			// 1. 進行中のクエリをキャンセル
			await queryClient.cancelQueries({
				queryKey: ["track-isrcs", variables.trackId],
			});
			await queryClient.cancelQueries({
				queryKey: ["track", variables.trackId],
			});

			// 2. 現在のキャッシュを保存（ロールバック用）
			const previousIsrcs = queryClient.getQueryData<TrackIsrc[]>([
				"track-isrcs",
				variables.trackId,
			]);

			// 3. 楽観的更新
			if (previousIsrcs) {
				queryClient.setQueryData<TrackIsrc[]>(
					["track-isrcs", variables.trackId],
					(old) =>
						old
							? old.map((isrc) =>
									isrc.id === variables.isrcId
										? { ...isrc, ...variables.data }
										: isrc,
								)
							: old,
				);
			}

			return { previousIsrcs };
		},

		onError: (
			err: unknown,
			variables: { trackId: string },
			context: { previousIsrcs: TrackIsrc[] | undefined } | undefined,
		) => {
			// ConflictErrorの場合はロールバックしない（ConflictDialogで処理するため）
			if (isConflictError(err)) return;

			// ロールバック処理
			if (context?.previousIsrcs) {
				queryClient.setQueryData(
					["track-isrcs", variables.trackId],
					context.previousIsrcs,
				);
			}
		},

		onSettled: (
			_data: TrackIsrc | undefined,
			_error: unknown,
			variables: { trackId: string },
		) => {
			// 成功・失敗に関わらずサーバーと同期
			queryClient.invalidateQueries({
				queryKey: ["track-isrcs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
	delete: (queryClient: QueryClient) => ({
		mutationFn: ({ trackId, isrcId }: { trackId: string; isrcId: string }) =>
			trackIsrcsApi.delete(trackId, isrcId),
		onSuccess: (
			_data: { success: boolean },
			variables: { trackId: string },
		) => {
			queryClient.invalidateQueries({
				queryKey: ["track-isrcs", variables.trackId],
			});
			queryClient.invalidateQueries({ queryKey: ["track", variables.trackId] });
		},
	}),
};

// ===== アルバム申請 =====

type UpdateAlbumRequestStatusData = {
	id: string;
	status: "approved" | "rejected";
	reviewerNotes?: string;
	updatedAt: string;
};

export const albumRequestMutations = {
	updateStatus: (queryClient: QueryClient) => ({
		mutationFn: ({
			id,
			status,
			reviewerNotes,
			updatedAt,
		}: UpdateAlbumRequestStatusData) =>
			albumRequestsApi.updateStatus(id, { status, reviewerNotes, updatedAt }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["admin", "album-requests"],
			});
		},
	}),
};
