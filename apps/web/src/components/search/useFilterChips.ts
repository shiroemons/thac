import { useCallback, useMemo } from "react";
import { createFilterChip } from "./FilterChips";
import type { AdvancedSearchFilters, FilterChip } from "./types";
import { DEFAULT_FILTERS, ROLE_LABELS } from "./types";

/**
 * フィルターチップの生成・削除ロジックを提供するカスタムフック
 *
 * 詳細検索モーダルと検索ページの両方で使用可能
 */
export function useFilterChips(
	filters: AdvancedSearchFilters,
	onFiltersChange: (filters: AdvancedSearchFilters) => void,
) {
	// フィルターチップの生成
	const chips = useMemo<FilterChip[]>(() => {
		const result: FilterChip[] = [];

		// テキスト検索
		if (filters.textSearch.artistName) {
			result.push(
				createFilterChip(
					"textSearch",
					"artistName",
					`アーティスト: ${filters.textSearch.artistName}`,
					"artistName",
				),
			);
		}
		if (filters.textSearch.circleName) {
			result.push(
				createFilterChip(
					"textSearch",
					"circleName",
					`サークル: ${filters.textSearch.circleName}`,
					"circleName",
				),
			);
		}
		if (filters.textSearch.albumName) {
			result.push(
				createFilterChip(
					"textSearch",
					"albumName",
					`作品: ${filters.textSearch.albumName}`,
					"albumName",
				),
			);
		}
		if (filters.textSearch.trackName) {
			result.push(
				createFilterChip(
					"textSearch",
					"trackName",
					`トラック: ${filters.textSearch.trackName}`,
					"trackName",
				),
			);
		}

		// 原曲
		for (const song of filters.originalSongs) {
			result.push(
				createFilterChip("originalSong", song.id, song.name, song.id),
			);
		}

		// アーティスト
		for (const artist of filters.artists) {
			result.push(
				createFilterChip(
					"artist",
					`${artist.role}-${artist.id}`,
					`${ROLE_LABELS[artist.role]}: ${artist.name}`,
					artist.id,
				),
			);
		}

		// サークル
		for (const circle of filters.circles) {
			result.push(
				createFilterChip("circle", circle.id, circle.name, circle.id),
			);
		}

		// 役割者数
		const getMatchSuffix = (matchType: "exact" | "gte" | "lte") => {
			if (matchType === "gte") return "以上";
			if (matchType === "lte") return "以下";
			return "";
		};
		if (filters.roleCounts.vocalistCount !== "any") {
			const entry = filters.roleCounts.vocalistCount;
			const suffix = getMatchSuffix(entry.matchType);
			const label = `ボーカル: ${entry.count}人${suffix}`;
			result.push(createFilterChip("roleCount", "vocalist", label, "vocalist"));
		}
		if (filters.roleCounts.lyricistCount !== "any") {
			const entry = filters.roleCounts.lyricistCount;
			const suffix = getMatchSuffix(entry.matchType);
			const label = `作詞者: ${entry.count}人${suffix}`;
			result.push(createFilterChip("roleCount", "lyricist", label, "lyricist"));
		}
		if (filters.roleCounts.composerCount !== "any") {
			const entry = filters.roleCounts.composerCount;
			const suffix = getMatchSuffix(entry.matchType);
			const label = `作曲者: ${entry.count}人${suffix}`;
			result.push(createFilterChip("roleCount", "composer", label, "composer"));
		}
		if (filters.roleCounts.arrangerCount !== "any") {
			const entry = filters.roleCounts.arrangerCount;
			const suffix = getMatchSuffix(entry.matchType);
			const label = `編曲者: ${entry.count}人${suffix}`;
			result.push(createFilterChip("roleCount", "arranger", label, "arranger"));
		}

		// 原曲数
		if (filters.songCount !== "any") {
			const label =
				typeof filters.songCount === "number"
					? `${filters.songCount}曲以上`
					: filters.songCount === "3+"
						? "3曲以上"
						: `${filters.songCount}曲`;
			result.push(
				createFilterChip("songCount", "count", label, filters.songCount),
			);
		}

		// 日付範囲
		if (filters.dateRange.from || filters.dateRange.to) {
			const from = filters.dateRange.from || "...";
			const to = filters.dateRange.to || "...";
			result.push(
				createFilterChip("date", "range", `${from} 〜 ${to}`, "date"),
			);
		}

		// イベント
		if (filters.event) {
			result.push(
				createFilterChip(
					"event",
					filters.event.id,
					filters.event.name,
					filters.event.id,
					filters.event.seriesName,
				),
			);
		}

		return result;
	}, [filters]);

	// チップ削除
	const handleRemoveChip = useCallback(
		(chip: FilterChip) => {
			switch (chip.type) {
				case "textSearch":
					onFiltersChange({
						...filters,
						textSearch: {
							...filters.textSearch,
							[chip.value as keyof typeof filters.textSearch]: "",
						},
					});
					break;
				case "originalSong":
					onFiltersChange({
						...filters,
						originalSongs: filters.originalSongs.filter(
							(s) => s.id !== chip.value,
						),
					});
					break;
				case "artist":
					onFiltersChange({
						...filters,
						artists: filters.artists.filter(
							(a) => `artist-${a.role}-${a.id}` !== chip.id,
						),
					});
					break;
				case "circle":
					onFiltersChange({
						...filters,
						circles: filters.circles.filter((c) => c.id !== chip.value),
					});
					break;
				case "roleCount":
					if (chip.value === "vocalist") {
						onFiltersChange({
							...filters,
							roleCounts: { ...filters.roleCounts, vocalistCount: "any" },
						});
					} else if (chip.value === "lyricist") {
						onFiltersChange({
							...filters,
							roleCounts: { ...filters.roleCounts, lyricistCount: "any" },
						});
					} else if (chip.value === "composer") {
						onFiltersChange({
							...filters,
							roleCounts: { ...filters.roleCounts, composerCount: "any" },
						});
					} else if (chip.value === "arranger") {
						onFiltersChange({
							...filters,
							roleCounts: { ...filters.roleCounts, arrangerCount: "any" },
						});
					}
					break;
				case "songCount":
					onFiltersChange({
						...filters,
						songCount: "any",
					});
					break;
				case "date":
					onFiltersChange({
						...filters,
						dateRange: {},
					});
					break;
				case "event":
					onFiltersChange({
						...filters,
						event: null,
					});
					break;
			}
		},
		[filters, onFiltersChange],
	);

	// すべてクリア
	const handleClearAll = useCallback(() => {
		onFiltersChange(DEFAULT_FILTERS);
	}, [onFiltersChange]);

	return { chips, handleRemoveChip, handleClearAll };
}
