/**
 * チャートデータ変換関数
 *
 * Nivoチャート用のデータ変換ロジックを提供。
 * TanStack Queryのselectオプションで使用することで、
 * キャッシュされた生データから派生データを効率的に計算できる。
 */

import type { BarDatum } from "@nivo/bar";
import type { SongStat, StackedWorkStat, WorkStat } from "@/lib/public-api";

export type SortOrder = "count-desc" | "count-asc" | "id";
export type ChartOrientation = "horizontal" | "vertical";

// チャート用の色パレット（区別しやすい8色）
const CHART_COLORS = [
	"#3b82f6", // blue
	"#ef4444", // red
	"#22c55e", // green
	"#f59e0b", // amber
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#f97316", // orange
];

// 文字列からハッシュ値を生成（項目ベースの色割り当て用）
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

// 項目IDから一貫した色を取得
function getColorForItem(id: string): string {
	const index = hashString(id) % CHART_COLORS.length;
	return CHART_COLORS[index];
}

/** チャートデータの共通インターフェース */
export interface ChartData {
	data: BarDatum[];
	keys: string[];
	indexBy: string;
	colors: string[] | ((bar: { id: string | number }) => string);
	isStacked: boolean;
}

/**
 * 原曲データをNivo用に変換（ドリルダウン表示用）
 */
export function transformSongsDataForNivo(
	songsData: SongStat[],
	sortOrder: SortOrder,
	orientation: ChartOrientation,
): ChartData {
	if (songsData.length === 0) {
		return {
			data: [],
			keys: [],
			indexBy: "songName",
			colors: ["#3b82f6"],
			isStacked: false,
		};
	}

	// ソート
	// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
	// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
	let sorted: SongStat[];
	if (orientation === "horizontal") {
		if (sortOrder === "id") {
			sorted = [...songsData].sort((a, b) => b.id.localeCompare(a.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...songsData].sort((a, b) => b.trackCount - a.trackCount);
		} else {
			sorted = [...songsData].sort((a, b) => a.trackCount - b.trackCount);
		}
	} else {
		// 縦グラフ: 通常の順序
		if (sortOrder === "id") {
			sorted = [...songsData].sort((a, b) => a.id.localeCompare(b.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...songsData].sort((a, b) => a.trackCount - b.trackCount);
		} else {
			sorted = [...songsData].sort((a, b) => b.trackCount - a.trackCount);
		}
	}

	return {
		data: sorted.map((s) => ({
			songId: s.id,
			songName: s.name ?? "不明",
			trackCount: s.trackCount,
		})),
		keys: ["trackCount"],
		indexBy: "songName",
		colors: ["#3b82f6"],
		isStacked: false,
	};
}

/**
 * 積み上げデータをNivo用に変換
 */
export function transformStackedDataForNivo(
	stackedData: StackedWorkStat[],
	sortOrder: SortOrder,
	orientation: ChartOrientation,
): ChartData {
	if (stackedData.length === 0) {
		return {
			data: [],
			keys: [],
			indexBy: "workName",
			colors: () => "#3b82f6",
			isStacked: true,
		};
	}

	// ソート
	// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
	// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
	let sorted: StackedWorkStat[];
	if (orientation === "horizontal") {
		if (sortOrder === "id") {
			sorted = [...stackedData].sort((a, b) => b.id.localeCompare(a.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...stackedData].sort(
				(a, b) => b.totalTrackCount - a.totalTrackCount,
			);
		} else {
			sorted = [...stackedData].sort(
				(a, b) => a.totalTrackCount - b.totalTrackCount,
			);
		}
	} else {
		// 縦グラフ: 通常の順序
		if (sortOrder === "id") {
			sorted = [...stackedData].sort((a, b) => a.id.localeCompare(b.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...stackedData].sort(
				(a, b) => a.totalTrackCount - b.totalTrackCount,
			);
		} else {
			sorted = [...stackedData].sort(
				(a, b) => b.totalTrackCount - a.totalTrackCount,
			);
		}
	}

	// 各ワーク内の曲をID順にソート
	for (const work of sorted) {
		work.songs.sort((a, b) => a.id.localeCompare(b.id));
	}

	// 全曲のユニークキーを収集（ID順でソート済み）
	const songKeysMap = new Map<string, { id: string; name: string }>();
	const colors: Record<string, string> = {};
	for (const work of sorted) {
		for (const song of work.songs) {
			const key = song.name ?? "不明";
			if (!songKeysMap.has(key)) {
				songKeysMap.set(key, { id: song.id, name: key });
			}
			if (!colors[key]) {
				colors[key] = getColorForItem(song.id);
			}
		}
	}
	// ID順でキーをソート
	const keys = Array.from(songKeysMap.values())
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((item) => item.name);

	// Nivo BarDatum形式に変換（totalTrackCountを含める）
	const data: BarDatum[] = sorted.map((work) => {
		const datum: BarDatum = {
			workId: work.id,
			workName: work.shortName ?? work.name ?? "不明",
			totalTrackCount: work.totalTrackCount,
		};
		for (const song of work.songs) {
			const key = song.name ?? "不明";
			datum[key] = song.trackCount;
		}
		return datum;
	});

	return {
		data,
		keys,
		indexBy: "workName",
		colors: (bar: { id: string | number }) =>
			colors[String(bar.id)] || "#3b82f6",
		isStacked: true,
	};
}

/**
 * 単純データをNivo用に変換
 */
export function transformSimpleDataForNivo(
	worksData: WorkStat[],
	sortOrder: SortOrder,
	orientation: ChartOrientation,
): ChartData {
	if (worksData.length === 0) {
		return {
			data: [],
			keys: [],
			indexBy: "workName",
			colors: ["#3b82f6"],
			isStacked: false,
		};
	}

	// ソート
	// 横グラフ: 配列の最初が下に表示されるため、視覚的な順序を逆にする
	// 縦グラフ: 配列の最初が左に表示されるため、通常の順序
	let sorted: WorkStat[];
	if (orientation === "horizontal") {
		if (sortOrder === "id") {
			sorted = [...worksData].sort((a, b) => b.id.localeCompare(a.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...worksData].sort((a, b) => b.trackCount - a.trackCount);
		} else {
			sorted = [...worksData].sort((a, b) => a.trackCount - b.trackCount);
		}
	} else {
		// 縦グラフ: 通常の順序
		if (sortOrder === "id") {
			sorted = [...worksData].sort((a, b) => a.id.localeCompare(b.id));
		} else if (sortOrder === "count-asc") {
			sorted = [...worksData].sort((a, b) => a.trackCount - b.trackCount);
		} else {
			sorted = [...worksData].sort((a, b) => b.trackCount - a.trackCount);
		}
	}

	return {
		data: sorted.map((w) => ({
			workId: w.id,
			workName: w.shortName ?? w.name ?? "不明",
			trackCount: w.trackCount,
		})),
		keys: ["trackCount"],
		indexBy: "workName",
		colors: ["#3b82f6"],
		isStacked: false,
	};
}
