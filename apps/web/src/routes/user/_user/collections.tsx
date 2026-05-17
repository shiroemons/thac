import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useMemo } from "react";
import { ItemTypeBadge } from "@/components/user/item-type-badge";
import { VisibilityBadge } from "@/components/user/visibility-badge";
import type {
	CollectionItemType,
	UserCollectionVisibility,
} from "@/lib/api-client";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userCollectionsListQueryOptions } from "@/lib/user-collections-query-options";

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

type ItemTypeFilter = CollectionItemType | "none";
type VisibilityFilter = UserCollectionVisibility;

interface CollectionsSearchParams {
	type?: ItemTypeFilter;
	visibility?: VisibilityFilter;
	q?: string;
}

export const Route = createFileRoute("/user/_user/collections")({
	head: () => createPageHead("マイコレクション"),
	headers: () => CACHE_HEADERS.PRIVATE,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			userCollectionsListQueryOptions({
				kind: "collection",
				excludeDefaultLiked: true,
			}),
		),
	validateSearch: (
		search: Record<string, unknown>,
	): CollectionsSearchParams => {
		const validItemTypes: ItemTypeFilter[] = [
			"track",
			"release",
			"circle",
			"artist",
			"none",
		];
		const validVisibilities: VisibilityFilter[] = [
			"private",
			"unlisted",
			"public",
		];
		return {
			type:
				typeof search.type === "string" &&
				validItemTypes.includes(search.type as ItemTypeFilter)
					? (search.type as ItemTypeFilter)
					: undefined,
			visibility:
				typeof search.visibility === "string" &&
				validVisibilities.includes(search.visibility as VisibilityFilter)
					? (search.visibility as VisibilityFilter)
					: undefined,
			q: typeof search.q === "string" && search.q !== "" ? search.q : undefined,
		};
	},
	component: CollectionsListPage,
});

// =============================================================================
// コンポーネント
// =============================================================================

function CollectionsListPage(): React.ReactNode {
	const {
		type: typeFilter,
		visibility: visibilityFilter,
		q,
	} = Route.useSearch();
	const navigate = useNavigate();

	const { data } = useSuspenseQuery(
		userCollectionsListQueryOptions({
			kind: "collection",
			excludeDefaultLiked: true,
		}),
	);

	const hasFilter =
		typeFilter !== undefined ||
		visibilityFilter !== undefined ||
		(q !== undefined && q !== "");

	const filtered = useMemo(() => {
		return data.items.filter((c) => {
			if (typeFilter === "none" && c.itemType !== null) return false;
			if (typeFilter && typeFilter !== "none" && c.itemType !== typeFilter)
				return false;
			if (visibilityFilter && c.visibility !== visibilityFilter) return false;
			if (q?.trim()) {
				const needle = q.trim().toLowerCase();
				const matchName = c.name.toLowerCase().includes(needle);
				const matchDesc =
					c.description?.toLowerCase().includes(needle) ?? false;
				if (!matchName && !matchDesc) return false;
			}
			return true;
		});
	}, [data.items, typeFilter, visibilityFilter, q]);

	function handleClearFilters(): void {
		navigate({ to: "/user/collections", search: {} });
	}

	function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>): void {
		const value = e.target.value;
		navigate({
			to: "/user/collections",
			search: {
				type: value !== "" ? (value as ItemTypeFilter) : undefined,
				visibility: visibilityFilter,
				q,
			},
			replace: true,
		});
	}

	function handleVisibilityChange(
		e: React.ChangeEvent<HTMLSelectElement>,
	): void {
		const value = e.target.value;
		navigate({
			to: "/user/collections",
			search: {
				type: typeFilter,
				visibility: value !== "" ? (value as VisibilityFilter) : undefined,
				q,
			},
			replace: true,
		});
	}

	function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
		const value = e.target.value;
		navigate({
			to: "/user/collections",
			search: {
				type: typeFilter,
				visibility: visibilityFilter,
				q: value !== "" ? value : undefined,
			},
			replace: true,
		});
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl">マイコレクション</h1>
				<Link to="/user/collections/new" className="btn btn-primary btn-sm">
					<Plus className="size-4" />
					新規作成
				</Link>
			</div>

			{/* フィルター行 */}
			<div className="flex flex-wrap items-center gap-2">
				<select
					className="select select-bordered select-sm w-full sm:w-44"
					value={typeFilter ?? ""}
					onChange={handleTypeChange}
					aria-label="種別で絞り込み"
				>
					<option value="">全て（種別）</option>
					<option value="track">楽曲</option>
					<option value="release">アルバム</option>
					<option value="circle">サークル</option>
					<option value="artist">アーティスト</option>
					<option value="none">未設定</option>
				</select>

				<select
					className="select select-bordered select-sm w-full sm:w-44"
					value={visibilityFilter ?? ""}
					onChange={handleVisibilityChange}
					aria-label="公開状態で絞り込み"
				>
					<option value="">全て（公開状態）</option>
					<option value="private">非公開</option>
					<option value="unlisted">限定公開</option>
					<option value="public">公開</option>
				</select>

				<div className="relative flex-1 sm:flex-none">
					<input
						type="search"
						className="input input-bordered input-sm w-full sm:min-w-48"
						placeholder="名前・説明文で検索..."
						value={q ?? ""}
						onChange={handleSearchChange}
						aria-label="コレクション名または説明文で検索"
					/>
				</div>

				{hasFilter && (
					<button
						type="button"
						className="btn btn-ghost btn-sm gap-1"
						onClick={handleClearFilters}
						aria-label="フィルターをクリア"
					>
						<X className="size-4" />
						クリア
					</button>
				)}
			</div>

			{data.items.length === 0 ? (
				<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
					<p className="text-base-content/60">
						コレクションがまだありません。新規作成してお気に入りの楽曲・アルバム・サークル・アーティストをまとめましょう。
					</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
					<p className="text-base-content/60">
						条件に一致するコレクションがありません。
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((c) => (
						<Link
							key={c.id}
							to="/user/collections/$id"
							params={{ id: c.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body">
								<h2 className="card-title text-lg">{c.name}</h2>
								{c.description && (
									<p className="line-clamp-2 text-base-content/60 text-sm">
										{c.description}
									</p>
								)}
								<div className="text-base-content/50 text-xs">
									{c.itemCount} 件
									{c.ordered && <span className="ml-2">・並び替え可</span>}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{c.itemType && (
										<ItemTypeBadge itemType={c.itemType} size="sm" />
									)}
									<VisibilityBadge visibility={c.visibility} />
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
