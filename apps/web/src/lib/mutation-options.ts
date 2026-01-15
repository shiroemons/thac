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
	type ParticipationType,
	type Platform,
	platformsApi,
	type Release,
	type ReleaseCircle,
	type ReleaseJanCode,
	type ReleasePublication,
	releaseCirclesApi,
	releaseJanCodesApi,
	releasePublicationsApi,
	releasesApi,
	type Track,
	type TrackCredit,
	type TrackDerivation,
	type TrackIsrc,
	type TrackOfficialSong,
	type TrackPublication,
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
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			platformsApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
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
	reorder: (queryClient: QueryClient) => ({
		mutationFn: (items: Array<{ code: string; sortOrder: number }>) =>
			officialWorkCategoriesApi.reorder(items),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
		},
	}),
};

// ===== リリースサークル（作品とサークルの関連付け） =====

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
		onSuccess: (_data: ReleaseCircle, variables: { releaseId: string }) => {
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["release", variables.releaseId, "full"],
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

// ===== リリース公開リンク =====

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

// ===== リリースJANコード =====

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
		onSuccess: (_data: ReleaseJanCode, variables: { releaseId: string }) => {
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
		onSuccess: (_data: TrackOfficialSong, variables: { trackId: string }) => {
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
		onSuccess: (_data: TrackPublication, variables: { trackId: string }) => {
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
		onSuccess: (_data: TrackIsrc, variables: { trackId: string }) => {
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
