/**
 * mutation-options.ts のユニットテスト
 *
 * 各 mutation factory が正しい構造を返し、
 * onSuccess/onSettled で適切な queryKey を invalidate することを検証する。
 */
import { describe, expect, test, vi } from "vitest";
import { ConflictError } from "./api-client";
import {
	aliasTypeMutations,
	artistAliasMutations,
	artistMutations,
	circleLinkMutations,
	circleMutations,
	creditRoleMutations,
	discMutations,
	eventDayMutations,
	eventMutations,
	eventSeriesMutations,
	officialSongMutations,
	officialWorkCategoryMutations,
	officialWorkMutations,
	platformMutations,
	releaseCircleMutations,
	releaseJanCodeMutations,
	releaseMutations,
	releasePublicationMutations,
	trackCreditMutations,
	trackDerivationMutations,
	trackIsrcMutations,
	trackMutations,
	trackOfficialSongMutations,
	trackPublicationMutations,
} from "./mutation-options";

// モック QueryClient を作成するヘルパー
function createMockQueryClient() {
	return {
		invalidateQueries: vi.fn(() => Promise.resolve()),
	};
}

// Optimistic updates テスト用の拡張モック QueryClient を作成するヘルパー
function createExtendedMockQueryClient() {
	const queryCache = new Map<string, unknown>();

	return {
		invalidateQueries: vi.fn(() => Promise.resolve()),
		cancelQueries: vi.fn(() => Promise.resolve()),
		getQueriesData: vi.fn(
			<T>(_filters: { queryKey: unknown[] }): [readonly unknown[], T][] => [],
		),
		getQueryData: vi.fn(<T>(_queryKey: unknown[]): T | undefined => undefined),
		setQueryData: vi.fn(
			<T>(_queryKey: unknown[], _data: T | ((old: T | undefined) => T)): T => {
				return undefined as T;
			},
		),
		// キャッシュを設定するヘルパー
		_setCache: (key: string, value: unknown) => {
			queryCache.set(key, value);
		},
		_getCache: (key: string) => queryCache.get(key),
	};
}

// コールバックを呼び出すヘルパー
function callCallback(
	config: Record<string, unknown>,
	name: "onSuccess" | "onSettled",
	variables?: Record<string, unknown>,
) {
	const callback = config[name] as ((...args: unknown[]) => void) | undefined;
	if (callback) {
		// onSuccess: (data, variables, context) or () => void
		// onSettled: (data, error, variables, context) or () => void
		if (name === "onSettled") {
			callback({}, null, variables || {}, undefined);
		} else {
			callback({}, variables || {}, undefined);
		}
	}
}

describe("mutation-options", () => {
	describe("artistMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
			expect(typeof config.mutationFn).toBe("function");
		});

		test("create.onSuccess invalidates artists query", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.create(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
		});

		test("update.onSettled invalidates artists and specific artist queries", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "test-id" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "test-id"],
			});
		});

		test("delete.onSuccess invalidates artists query", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
		});

		test("batchDelete.onSettled invalidates artists query", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.batchDelete(queryClient as never);

			callCallback(config, "onSettled");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
		});
	});

	describe("artistMutations.update with optimistic updates", () => {
		test("onMutate should return rollback context", async () => {
			const queryClient = createExtendedMockQueryClient();

			// getQueriesDataが空配列を返すようにモック
			queryClient.getQueriesData.mockReturnValue([]);
			// getQueryDataがundefinedを返すようにモック（詳細データなし）
			queryClient.getQueryData.mockReturnValue(undefined);

			const config = artistMutations.update(queryClient as never);

			const variables = { id: "test-id", data: { name: "New Name" } };
			const context = await config.onMutate(variables);

			// contextが返されることを確認
			expect(context).toBeDefined();
			expect(context).toHaveProperty("previousArtists");
			expect(context).toHaveProperty("previousDetail");
			expect(context).toHaveProperty("previousFull");
		});

		test("onMutate should update cache optimistically", async () => {
			const queryClient = createExtendedMockQueryClient();

			// 既存のアーティスト詳細データ
			const existingDetail = {
				id: "test-id",
				name: "Old Name",
				aliases: [],
			};

			// getQueriesDataがリストデータを返すようにモック
			const listData = {
				data: [{ id: "test-id", name: "Old Name" }],
				pagination: { page: 1, limit: 10, total: 1 },
			};
			queryClient.getQueriesData.mockReturnValue([
				[["artists"], listData],
			] as never);

			// getQueryDataが詳細データを返すようにモック
			queryClient.getQueryData.mockImplementation((queryKey: unknown[]) => {
				if (
					Array.isArray(queryKey) &&
					queryKey[0] === "artist" &&
					queryKey[1] === "test-id"
				) {
					if (queryKey.length === 2) return existingDetail;
					if (queryKey[2] === "full")
						return { artist: existingDetail, aliases: [] };
				}
				return undefined;
			});

			const config = artistMutations.update(queryClient as never);

			const variables = { id: "test-id", data: { name: "New Name" } };
			await config.onMutate(variables);

			// cancelQueriesが呼ばれることを確認
			expect(queryClient.cancelQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
			expect(queryClient.cancelQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "test-id"],
			});

			// setQueryDataが呼ばれることを確認（楽観的更新）
			expect(queryClient.setQueryData).toHaveBeenCalled();
		});

		test("onError should rollback on non-conflict errors", () => {
			const queryClient = createExtendedMockQueryClient();
			const config = artistMutations.update(queryClient as never);

			const previousArtists: [readonly unknown[], unknown][] = [
				[["artists"], { data: [{ id: "test-id", name: "Old Name" }] }],
			];
			const previousDetail = { id: "test-id", name: "Old Name", aliases: [] };
			const previousFull = {
				artist: { id: "test-id", name: "Old Name" },
				aliases: [],
			};

			const context = { previousArtists, previousDetail, previousFull };
			const variables = { id: "test-id", data: { name: "New Name" } };
			const nonConflictError = new Error("Network error");

			// onErrorを呼び出す
			config.onError(nonConflictError, variables, context as never);

			// ロールバックが実行されることを確認（setQueryDataが呼ばれる）
			expect(queryClient.setQueryData).toHaveBeenCalledTimes(3);
			// リストデータのロールバック
			expect(queryClient.setQueryData).toHaveBeenCalledWith(
				["artists"],
				previousArtists[0][1],
			);
			// 詳細データのロールバック
			expect(queryClient.setQueryData).toHaveBeenCalledWith(
				["artist", "test-id"],
				previousDetail,
			);
			// フルデータのロールバック
			expect(queryClient.setQueryData).toHaveBeenCalledWith(
				["artist", "test-id", "full"],
				previousFull,
			);
		});

		test("onError should NOT rollback on ConflictError", () => {
			const queryClient = createExtendedMockQueryClient();
			const config = artistMutations.update(queryClient as never);

			const previousArtists: [readonly unknown[], unknown][] = [
				[["artists"], { data: [{ id: "test-id", name: "Old Name" }] }],
			];
			const previousDetail = { id: "test-id", name: "Old Name", aliases: [] };
			const previousFull = {
				artist: { id: "test-id", name: "Old Name" },
				aliases: [],
			};

			const context = { previousArtists, previousDetail, previousFull };
			const variables = { id: "test-id", data: { name: "New Name" } };
			const conflictError = new ConflictError("Conflict detected", {
				id: "test-id",
				name: "Server Name",
			});

			// onErrorを呼び出す
			config.onError(conflictError, variables, context as never);

			// ロールバックが実行されないことを確認（setQueryDataが呼ばれない）
			expect(queryClient.setQueryData).not.toHaveBeenCalled();
		});

		test("onSettled should invalidate related queries", () => {
			const queryClient = createExtendedMockQueryClient();
			const config = artistMutations.update(queryClient as never);

			const variables = { id: "test-id", data: { name: "New Name" } };

			// onSettledを呼び出す（成功時）
			config.onSettled(
				{ id: "test-id", name: "New Name" } as never,
				undefined,
				variables,
			);

			// invalidateQueriesが呼ばれることを確認
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artists"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "test-id"],
			});
		});
	});

	describe("artistAliasMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates artistAliases and artist queries", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { artistId: "artist-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAliases"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "artist-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "artist-123", "full"],
			});
		});

		test("update.onSettled invalidates artistAliases and artistAlias queries", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "alias-123", data: {} });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAliases"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAlias", "alias-123"],
			});
		});

		test("update.onSettled invalidates artist queries when artistId is provided", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.update(queryClient as never);

			callCallback(config, "onSettled", {
				id: "alias-123",
				artistId: "artist-456",
			});

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAliases"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAlias", "alias-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artist", "artist-456"],
			});
		});

		test("delete.onSuccess invalidates artistAliases query", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAliases"],
			});
		});

		test("batchDelete.onSettled invalidates artistAliases query", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.batchDelete(queryClient as never);

			callCallback(config, "onSettled");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["artistAliases"],
			});
		});
	});

	describe("circleMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = circleMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates circles and specific circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "circle-id" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circles"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-id"],
			});
		});

		test("batchDelete.onSettled invalidates circles query", () => {
			const queryClient = createMockQueryClient();
			const config = circleMutations.batchDelete(queryClient as never);

			callCallback(config, "onSettled");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circles"],
			});
		});
	});

	describe("eventSeriesMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = eventSeriesMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates eventSeries query", () => {
			const queryClient = createMockQueryClient();
			const config = eventSeriesMutations.create(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["eventSeries"],
			});
		});

		test("update.onSettled invalidates eventSeries and specific event-series queries", () => {
			const queryClient = createMockQueryClient();
			const config = eventSeriesMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "series-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["eventSeries"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["eventSeries", "series-123"],
			});
		});

		test("delete.onSuccess invalidates eventSeries query", () => {
			const queryClient = createMockQueryClient();
			const config = eventSeriesMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["eventSeries"],
			});
		});

		test("reorder.onSuccess invalidates eventSeries query", () => {
			const queryClient = createMockQueryClient();
			const config = eventSeriesMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["eventSeries"],
			});
		});
	});

	describe("releaseMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = releaseMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates releases and specific release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "release-id" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["releases"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-id"],
			});
		});

		test("batchDelete.onSettled invalidates releases query", () => {
			const queryClient = createMockQueryClient();
			const config = releaseMutations.batchDelete(queryClient as never);

			callCallback(config, "onSettled");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["releases"],
			});
		});
	});

	describe("trackMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("batchDelete.onSettled invalidates tracks and releases queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackMutations.batchDelete(queryClient as never);

			callCallback(config, "onSettled");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["tracks"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["releases"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release"],
			});
		});

		test("reorder.onSuccess invalidates release query", () => {
			const queryClient = createMockQueryClient();
			const config = trackMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
		});
	});

	describe("platformMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = platformMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates platforms and specific platform queries", () => {
			const queryClient = createMockQueryClient();
			const config = platformMutations.update(queryClient as never);

			callCallback(config, "onSettled", { code: "spotify" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["platforms"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["platform", "spotify"],
			});
		});

		test("reorder.onSuccess invalidates platforms query", () => {
			const queryClient = createMockQueryClient();
			const config = platformMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["platforms"],
			});
		});
	});

	describe("aliasTypeMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = aliasTypeMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates aliasTypes and specific aliasType queries", () => {
			const queryClient = createMockQueryClient();
			const config = aliasTypeMutations.update(queryClient as never);

			callCallback(config, "onSettled", { code: "vocal" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["aliasTypes"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["aliasType", "vocal"],
			});
		});

		test("reorder.onSuccess invalidates aliasTypes query", () => {
			const queryClient = createMockQueryClient();
			const config = aliasTypeMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["aliasTypes"],
			});
		});
	});

	describe("creditRoleMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = creditRoleMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates creditRoles and specific creditRole queries", () => {
			const queryClient = createMockQueryClient();
			const config = creditRoleMutations.update(queryClient as never);

			callCallback(config, "onSettled", { code: "composer" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["creditRoles"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["creditRole", "composer"],
			});
		});

		test("reorder.onSuccess invalidates creditRoles query", () => {
			const queryClient = createMockQueryClient();
			const config = creditRoleMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["creditRoles"],
			});
		});
	});

	describe("officialWorkCategoryMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkCategoryMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("update.onSettled invalidates officialWorkCategories and specific category queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkCategoryMutations.update(queryClient as never);

			callCallback(config, "onSettled", { code: "game" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorkCategories"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorkCategory", "game"],
			});
		});

		test("reorder.onSuccess invalidates officialWorkCategories query", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkCategoryMutations.reorder(
				queryClient as never,
			);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorkCategories"],
			});
		});
	});

	describe("circleLinkMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = circleLinkMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleLinkMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { circleId: "circle-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123", "full"],
			});
		});

		test("update.onSettled invalidates circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleLinkMutations.update(queryClient as never);

			callCallback(config, "onSettled", { circleId: "circle-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123"],
			});
		});

		test("delete.onSuccess invalidates circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleLinkMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { circleId: "circle-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123", "full"],
			});
		});
	});

	describe("eventMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = eventMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates events query", () => {
			const queryClient = createMockQueryClient();
			const config = eventMutations.create(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["events"],
			});
		});

		test("update.onSettled invalidates events and specific event queries", () => {
			const queryClient = createMockQueryClient();
			const config = eventMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "event-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["events"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["event", "event-123"],
			});
		});

		test("delete.onSuccess invalidates events query", () => {
			const queryClient = createMockQueryClient();
			const config = eventMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["events"],
			});
		});
	});

	describe("eventDayMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = eventDayMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates event query", () => {
			const queryClient = createMockQueryClient();
			const config = eventDayMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { eventId: "event-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["event", "event-123"],
			});
		});

		test("update.onSettled invalidates event query", () => {
			const queryClient = createMockQueryClient();
			const config = eventDayMutations.update(queryClient as never);

			callCallback(config, "onSettled", { eventId: "event-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["event", "event-123"],
			});
		});

		test("delete.onSuccess invalidates event query", () => {
			const queryClient = createMockQueryClient();
			const config = eventDayMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { eventId: "event-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["event", "event-123"],
			});
		});
	});

	describe("discMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = discMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = discMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("update.onSettled invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = discMutations.update(queryClient as never);

			callCallback(config, "onSettled", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
		});

		test("delete.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = discMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});
	});

	describe("officialWorkMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates officialWorks query", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkMutations.create(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorks"],
			});
		});

		test("update.onSettled invalidates officialWorks and specific work queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "work-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorks"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWork", "work-123"],
			});
		});

		test("delete.onSuccess invalidates officialWorks query", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialWorks"],
			});
		});
	});

	describe("officialSongMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = officialSongMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates officialSongs query", () => {
			const queryClient = createMockQueryClient();
			const config = officialSongMutations.create(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialSongs"],
			});
		});

		test("update.onSettled invalidates officialSongs and specific song queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialSongMutations.update(queryClient as never);

			callCallback(config, "onSettled", { id: "song-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialSongs"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialSong", "song-123"],
			});
		});

		test("delete.onSuccess invalidates officialSongs query", () => {
			const queryClient = createMockQueryClient();
			const config = officialSongMutations.delete(queryClient as never);

			callCallback(config, "onSuccess");

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["officialSongs"],
			});
		});
	});

	describe("releaseCircleMutations", () => {
		test("add returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = releaseCircleMutations.add(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("add.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseCircleMutations.add(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("update.onSettled invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseCircleMutations.update(queryClient as never);

			callCallback(config, "onSettled", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("remove.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseCircleMutations.remove(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});
	});

	describe("releasePublicationMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = releasePublicationMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releasePublicationMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("update.onSettled invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releasePublicationMutations.update(queryClient as never);

			callCallback(config, "onSettled", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("delete.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releasePublicationMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});
	});

	describe("releaseJanCodeMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = releaseJanCodeMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseJanCodeMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("update.onSettled invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseJanCodeMutations.update(queryClient as never);

			callCallback(config, "onSettled", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("delete.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseJanCodeMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});
	});

	describe("trackCreditMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackCreditMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates track and release queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackCreditMutations.create(queryClient as never);

			callCallback(config, "onSuccess", {
				trackId: "track-123",
				releaseId: "release-123",
			});

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("update.onSettled invalidates track and release queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackCreditMutations.update(queryClient as never);

			callCallback(config, "onSettled", {
				trackId: "track-123",
				releaseId: "release-123",
			});

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});

		test("delete.onSuccess invalidates track and release queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackCreditMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", {
				trackId: "track-123",
				releaseId: "release-123",
			});

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
			});
		});
	});

	describe("trackOfficialSongMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates track-official-songs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-official-songs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("update.onSettled invalidates track-official-songs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.update(queryClient as never);

			callCallback(config, "onSettled", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-official-songs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("delete.onSuccess invalidates track-official-songs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-official-songs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("reorder.onSuccess invalidates track-official-songs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.reorder(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-official-songs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});
	});

	describe("trackDerivationMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackDerivationMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates track-derivations and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackDerivationMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-derivations", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("delete.onSuccess invalidates track-derivations and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackDerivationMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-derivations", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});
	});

	describe("trackPublicationMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackPublicationMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates track-publications and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackPublicationMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-publications", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("update.onSettled invalidates track-publications and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackPublicationMutations.update(queryClient as never);

			callCallback(config, "onSettled", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-publications", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("delete.onSuccess invalidates track-publications and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackPublicationMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-publications", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});
	});

	describe("trackIsrcMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = trackIsrcMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
		});

		test("create.onSuccess invalidates track-isrcs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackIsrcMutations.create(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-isrcs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("update.onSettled invalidates track-isrcs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackIsrcMutations.update(queryClient as never);

			callCallback(config, "onSettled", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-isrcs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});

		test("delete.onSuccess invalidates track-isrcs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackIsrcMutations.delete(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track-isrcs", "track-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["track", "track-123"],
			});
		});
	});
});
