import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Music } from "lucide-react";
import { useMemo } from "react";
import { PublicBreadcrumb } from "@/components/public";
import { createPageHead } from "@/lib/head";
import {
	getArrangeCount,
	getSongsByWorkId,
	getWorksByProductType,
	productTypes,
} from "@/mocks/official";
import type { OfficialWork, ProductType } from "@/types/official";

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

interface OriginalSongsSearchParams {
	type?: ProductType | "all";
	open?: string; // カンマ区切りの作品ID（例: "0201,0202"）
}

const PRODUCT_TYPES = [
	"pc98",
	"windows",
	"zuns_music_collection",
	"akyus_untouched_score",
	"commercial_books",
	"tasofro",
	"other",
] as const;

function isValidProductType(value: unknown): value is ProductType | "all" {
	if (typeof value !== "string") return false;
	return value === "all" || PRODUCT_TYPES.includes(value as ProductType);
}

function parseTypeParam(value: unknown): ProductType | "all" {
	return isValidProductType(value) ? value : "all";
}

function parseOpenParam(value: unknown): string | undefined {
	if (typeof value !== "string" || value === "") return undefined;
	return value;
}

export const Route = createFileRoute("/_public/original-songs")({
	head: () => createPageHead("原曲"),
	component: OriginalSongsPage,
	validateSearch: (
		search: Record<string, unknown>,
	): OriginalSongsSearchParams => {
		return {
			type: parseTypeParam(search.type),
			open: parseOpenParam(search.open),
		};
	},
});

// =============================================================================
// localStorage キー
// =============================================================================
const STORAGE_KEY = "original-songs-expanded-works";

// =============================================================================
// メインコンポーネント
// =============================================================================

function OriginalSongsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { type = "all", open } = Route.useSearch();

	// カテゴリでフィルタリングした作品一覧
	const filteredWorks = useMemo(() => {
		return getWorksByProductType(type);
	}, [type]);

	// 展開中の作品ID一覧（URL優先、なければlocalStorage）
	const expandedWorkIds = useMemo(() => {
		if (open) {
			// URLパラメータから取得
			const ids = open.split(",").filter((id) => id.trim() !== "");
			const validIds = ids.filter((id) =>
				filteredWorks.some((w) => w.id === id),
			);
			return new Set(validIds);
		}
		// localStorageから取得（フォールバック）
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved) as string[];
					const validIds = parsed.filter((id) =>
						filteredWorks.some((w) => w.id === id),
					);
					return new Set(validIds);
				} catch {
					return new Set<string>();
				}
			}
		}
		return new Set<string>();
	}, [open, filteredWorks]);

	// 作品アコーディオンの展開/折りたたみ
	const handleToggle = (workId: string) => {
		const next = new Set(expandedWorkIds);
		if (next.has(workId)) {
			next.delete(workId);
		} else {
			next.add(workId);
		}

		// URLとlocalStorageを更新
		const openParam = next.size > 0 ? [...next].join(",") : undefined;
		if (next.size > 0) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}

		navigate({
			search: { type, open: openParam },
		});
	};

	// カテゴリ変更
	const handleTypeChange = (newType: ProductType | "all") => {
		navigate({
			search: { type: newType, open: undefined },
		});
	};

	// 総楽曲数を計算
	const totalSongCount = useMemo(() => {
		return filteredWorks.reduce((sum, work) => {
			return sum + getSongsByWorkId(work.id).length;
		}, 0);
	}, [filteredWorks]);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "原曲" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">原曲一覧</h1>
					<p className="mt-1 text-base-content/70">
						東方Project公式楽曲 · {filteredWorks.length}作品 · {totalSongCount}
						曲
					</p>
				</div>
				<Link to="/official-works" className="btn btn-outline btn-sm gap-1">
					<Music className="size-4" />
					公式作品一覧
					<ChevronRight className="size-4" />
				</Link>
			</div>

			{/* Step 1: カテゴリフィルター */}
			<div className="space-y-2">
				<h2 className="font-medium text-base-content/70 text-sm">
					カテゴリを選択
				</h2>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className={`btn btn-sm ${type === "all" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => handleTypeChange("all")}
						aria-pressed={type === "all"}
					>
						すべて
					</button>
					{productTypes.map((pt) => (
						<button
							key={pt.code}
							type="button"
							className={`btn btn-sm ${type === pt.code ? "btn-primary" : "btn-ghost"}`}
							onClick={() => handleTypeChange(pt.code)}
							aria-pressed={type === pt.code}
						>
							{pt.name}
						</button>
					))}
				</div>
			</div>

			{/* Step 2: 作品アコーディオン */}
			<div className="space-y-2">
				<h2 className="font-medium text-base-content/70 text-sm">
					作品を選択して楽曲を表示
				</h2>
				{filteredWorks.length === 0 ? (
					<p className="text-base-content/50">
						選択したカテゴリに作品がありません
					</p>
				) : (
					<div className="join join-vertical w-full">
						{filteredWorks.map((work) => (
							<WorkAccordion
								key={work.id}
								work={work}
								isExpanded={expandedWorkIds.has(work.id)}
								onToggle={() => handleToggle(work.id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// =============================================================================
// 作品アコーディオン
// =============================================================================

interface WorkAccordionProps {
	work: OfficialWork;
	isExpanded: boolean;
	onToggle: () => void;
}

function WorkAccordion({ work, isExpanded, onToggle }: WorkAccordionProps) {
	// 楽曲一覧（アレンジ数付き）
	const songsWithArrangeCount = useMemo(() => {
		return getSongsByWorkId(work.id).map((song) => ({
			...song,
			arrangeCount: getArrangeCount(song.id),
		}));
	}, [work.id]);

	return (
		<div className="collapse-arrow join-item collapse border border-base-300 bg-base-100">
			<input
				type="checkbox"
				checked={isExpanded}
				onChange={onToggle}
				aria-label={`${work.shortName}の楽曲一覧を${isExpanded ? "閉じる" : "開く"}`}
			/>
			<div className="collapse-title font-medium">
				<span>{work.shortName}</span>
				<span className="badge badge-ghost badge-sm ml-2">
					{songsWithArrangeCount.length}曲
				</span>
			</div>
			<div className="collapse-content">
				{songsWithArrangeCount.length === 0 ? (
					<p className="pt-2 text-base-content/50">楽曲データがありません</p>
				) : (
					<div className="overflow-x-auto pt-2">
						<table className="table-sm table">
							<thead>
								<tr>
									<th className="w-16">Track</th>
									<th>曲名</th>
									<th className="hidden sm:table-cell">作曲者</th>
									<th className="w-24 text-right">アレンジ数</th>
								</tr>
							</thead>
							<tbody>
								{songsWithArrangeCount
									.sort((a, b) => a.trackNumber - b.trackNumber)
									.map((song) => (
										<tr key={song.id} className="hover:bg-base-200/50">
											<td className="text-base-content/70">
												{song.trackNumber.toString().padStart(2, "0")}
											</td>
											<td>
												<Link
													to="/original-songs/$id"
													params={{ id: song.id }}
													className="hover:text-primary"
												>
													<div className="font-medium">{song.name}</div>
												</Link>
											</td>
											<td className="hidden text-base-content/70 sm:table-cell">
												{song.composer}
											</td>
											<td className="text-right text-primary">
												{song.arrangeCount.toLocaleString()}
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
