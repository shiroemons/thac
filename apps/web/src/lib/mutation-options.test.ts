/**
 * mutation-options.ts のユニットテスト
 *
 * 各 mutation factory が正しい構造を返し、
 * onSuccess/onSettled で適切な queryKey を invalidate することを検証する。
 */
import { describe, expect, mock, test } from "bun:test";
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
		invalidateQueries: mock(() => Promise.resolve()),
	};
}

// コールバックを呼び出すヘルパー
function callCallback(
	config: Record<string, unknown>,
	name: "onSuccess" | "onSettled",
	variables?: Record<string, string>,
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

		test("update.onSuccess invalidates artists and specific artist queries", () => {
			const queryClient = createMockQueryClient();
			const config = artistMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "test-id" });

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

	describe("artistAliasMutations", () => {
		test("create returns correct mutation config", () => {
			const queryClient = createMockQueryClient();
			const config = artistAliasMutations.create(queryClient as never);

			expect(config).toHaveProperty("mutationFn");
			expect(config).toHaveProperty("onSuccess");
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

		test("update.onSuccess invalidates circles and specific circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "circle-id" });

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

		test("update.onSuccess invalidates releases and specific release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "release-id" });

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

		test("update.onSuccess invalidates platforms and specific platform queries", () => {
			const queryClient = createMockQueryClient();
			const config = platformMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { code: "spotify" });

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

		test("update.onSuccess invalidates aliasTypes and specific aliasType queries", () => {
			const queryClient = createMockQueryClient();
			const config = aliasTypeMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { code: "vocal" });

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

		test("update.onSuccess invalidates creditRoles and specific creditRole queries", () => {
			const queryClient = createMockQueryClient();
			const config = creditRoleMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { code: "composer" });

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

		test("update.onSuccess invalidates officialWorkCategories and specific category queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkCategoryMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { code: "game" });

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

		test("update.onSuccess invalidates circle queries", () => {
			const queryClient = createMockQueryClient();
			const config = circleLinkMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { circleId: "circle-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["circle", "circle-123", "full"],
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

		test("update.onSuccess invalidates events and specific event queries", () => {
			const queryClient = createMockQueryClient();
			const config = eventMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "event-123" });

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

		test("update.onSuccess invalidates event query", () => {
			const queryClient = createMockQueryClient();
			const config = eventDayMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { eventId: "event-123" });

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

		test("update.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = discMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123"],
			});
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["release", "release-123", "full"],
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

		test("update.onSuccess invalidates officialWorks and specific work queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialWorkMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "work-123" });

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

		test("update.onSuccess invalidates officialSongs and specific song queries", () => {
			const queryClient = createMockQueryClient();
			const config = officialSongMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { id: "song-123" });

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

		test("update.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseCircleMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

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

		test("update.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releasePublicationMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

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

		test("update.onSuccess invalidates release queries", () => {
			const queryClient = createMockQueryClient();
			const config = releaseJanCodeMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { releaseId: "release-123" });

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

		test("update.onSuccess invalidates track and release queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackCreditMutations.update(queryClient as never);

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

		test("update.onSuccess invalidates track-official-songs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackOfficialSongMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

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

		test("update.onSuccess invalidates track-publications and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackPublicationMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

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

		test("update.onSuccess invalidates track-isrcs and track queries", () => {
			const queryClient = createMockQueryClient();
			const config = trackIsrcMutations.update(queryClient as never);

			callCallback(config, "onSuccess", { trackId: "track-123" });

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
