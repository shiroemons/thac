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
	aliasTypesApi,
	artistAliasesApi,
	artistsApi,
	type Circle,
	type CircleLink,
	type CreditRole,
	circleLinksApi,
	circlesApi,
	creditRolesApi,
	type Disc,
	discsApi,
	type Event,
	type EventDay,
	type EventSeries,
	eventDaysApi,
	eventSeriesApi,
	eventsApi,
	type OfficialSong,
	type OfficialWork,
	type OfficialWorkCategory,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
	type Platform,
	platformsApi,
	type Release,
	releasesApi,
	type Track,
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
		onSuccess: (_data: Artist, variables: { id: string }) => {
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
		mutationFn: ({ id, data }: { id: string; data: UpdateArtistAliasData }) =>
			artistAliasesApi.update(id, data),
		onSuccess: (
			_data: ArtistAlias,
			variables: { id: string; data: UpdateArtistAliasData },
		) => {
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
			queryClient.invalidateQueries({
				queryKey: ["artistAlias", variables.id],
			});
			// artistIdがある場合、アーティスト詳細も無効化
			if (variables.data.artistId) {
				queryClient.invalidateQueries({
					queryKey: ["artist", variables.data.artistId],
				});
				queryClient.invalidateQueries({
					queryKey: ["artist", variables.data.artistId, "full"],
				});
			}
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
		onSuccess: (_data: Circle, variables: { id: string }) => {
			queryClient.invalidateQueries({ queryKey: ["circles"] });
			queryClient.invalidateQueries({ queryKey: ["circle", variables.id] });
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.id, "full"],
			});
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
		onSuccess: (_data: CircleLink, variables: { circleId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId],
			});
			queryClient.invalidateQueries({
				queryKey: ["circle", variables.circleId, "full"],
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
		onSuccess: (_data: EventSeries, variables: { id: string }) => {
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
		onSuccess: (_data: Event, variables: { id: string }) => {
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
		onSuccess: (_data: EventDay, variables: { eventId: string }) => {
			queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
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

// ===== リリース =====

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
		onSuccess: (_data: Release, variables: { id: string }) => {
			queryClient.invalidateQueries({ queryKey: ["releases"] });
			queryClient.invalidateQueries({ queryKey: ["release", variables.id] });
			queryClient.invalidateQueries({
				queryKey: ["release", variables.id, "full"],
			});
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
		onSuccess: (_data: Disc, variables: { releaseId: string }) => {
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
		onSuccess: (
			_data: Track,
			variables: { releaseId: string; trackId: string },
		) => {
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
		onSuccess: (_data: OfficialWork, variables: { id: string }) => {
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
		onSuccess: (_data: OfficialSong, variables: { id: string }) => {
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
		onSuccess: (_data: Platform, variables: { code: string }) => {
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
};

// ===== マスターデータ: 名義種別 =====

type CreateAliasTypeData = Omit<AliasType, "createdAt" | "updatedAt">;
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
		onSuccess: (_data: AliasType, variables: { code: string }) => {
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
};

// ===== マスターデータ: クレジット役割 =====

type CreateCreditRoleData = Omit<CreditRole, "createdAt" | "updatedAt">;
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
		onSuccess: (_data: CreditRole, variables: { code: string }) => {
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
};

// ===== マスターデータ: 公式作品カテゴリ =====

type CreateOfficialWorkCategoryData = Omit<
	OfficialWorkCategory,
	"createdAt" | "updatedAt"
>;
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
		onSuccess: (_data: OfficialWorkCategory, variables: { code: string }) => {
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
};
