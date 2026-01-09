import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Music, Users } from "lucide-react";
import { useRef, useState } from "react";
import {
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	TwoStageScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { SearchInput } from "@/components/ui/search-input";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import type { KanaRow } from "@/lib/kana-utils";
import { publicApi } from "@/lib/public-api";
import {
	type AlphabetInitial,
	parseInitialParam,
	parsePageParam,
	parseRowParam,
	parseScriptParam,
	type ScriptCategory,
} from "@/lib/script-filter-utils";

// =============================================================================
// 役割フィルター
// =============================================================================

type RoleType = "all" | "arranger" | "lyricist" | "vocalist";

const ROLE_TYPES: readonly RoleType[] = [
	"all",
	"arranger",
	"lyricist",
	"vocalist",
] as const;

interface RoleConfig {
	label: string;
	badgeClass: string;
}

const roleConfig: Record<RoleType, RoleConfig> = {
	all: { label: "すべて", badgeClass: "" },
	arranger: { label: "編曲", badgeClass: "badge-primary" },
	lyricist: { label: "作詞", badgeClass: "badge-secondary" },
	vocalist: { label: "ボーカル", badgeClass: "badge-accent" },
};

// 役割コードに対応するバッジクラスを取得
const getRoleBadgeClass = (roleCode: string): string => {
	const config = roleConfig[roleCode as RoleType];
	return config?.badgeClass || "badge-ghost";
};

function isValidRoleType(value: unknown): value is RoleType {
	return typeof value === "string" && ROLE_TYPES.includes(value as RoleType);
}

function parseRoleParam(value: unknown): RoleType {
	return isValidRoleType(value) ? value : "all";
}

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

interface ArtistsSearchParams {
	script?: ScriptCategory;
	initial?: string; // A-Z
	row?: string; // あ, か, さ...
	role?: RoleType;
	page?: number;
	view?: ViewMode;
	search?: string;
}

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/artists")({
	head: () => createPageHead("アーティスト"),
	loaderDeps: ({ search }) => ({
		script: search.script,
		initial: search.initial,
		row: search.row,
		role: search.role,
		page: search.page,
		search: search.search,
	}),
	loader: async ({ deps }) => {
		const { script, initial, row, role, page, search } = deps;

		try {
			const response = await publicApi.artists.list({
				page: page || 1,
				limit: PAGE_SIZE,
				initialScript: script === "all" ? undefined : script,
				initial: script === "alphabet" ? initial : undefined,
				row: script === "kana" ? row : undefined,
				role: role === "all" ? undefined : role,
				search: search || undefined,
			});
			return { artists: response.data, total: response.total };
		} catch {
			return { artists: [], total: 0 };
		}
	},
	component: ArtistsPage,
	validateSearch: (search: Record<string, unknown>): ArtistsSearchParams => {
		const script = parseScriptParam(search.script);
		return {
			script,
			initial:
				script === "alphabet" ? parseInitialParam(search.initial) : undefined,
			row: script === "kana" ? parseRowParam(search.row) : undefined,
			role: parseRoleParam(search.role),
			page: parsePageParam(search.page),
			view:
				search.view === "grid" || search.view === "list" ? search.view : "list",
			search: typeof search.search === "string" ? search.search : undefined,
		};
	},
});

// =============================================================================
// コンポーネント
// =============================================================================

function ArtistsPage() {
	const navigate = useNavigate();
	const {
		script = "all",
		initial,
		row,
		role = "all",
		page = 1,
		view = "list",
		search = "",
	} = Route.useSearch();
	const { artists, total } = Route.useLoaderData();

	// 検索入力のローカルステート（IME対応）
	const [searchInput, setSearchInput] = useState(search);
	const isComposingRef = useRef(false);

	// 型安全なパラメータ
	const scriptCategory = script as ScriptCategory;
	const alphabetInitial = initial as AlphabetInitial | undefined;
	const kanaRow = row as KanaRow | undefined;
	const roleFilter = role as RoleType;

	// ページネーション
	const totalPages = Math.ceil(total / PAGE_SIZE);

	// ナビゲーションハンドラー
	const handleScriptCategoryChange = (newScript: ScriptCategory) => {
		navigate({
			to: "/artists",
			search: {
				script: newScript,
				role: roleFilter,
				page: 1,
				view,
				search: search || undefined,
			},
		});
	};

	const handleAlphabetInitialChange = (newInitial: AlphabetInitial | null) => {
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: newInitial ?? undefined,
				role: roleFilter,
				page: 1,
				view,
				search: search || undefined,
			},
		});
	};

	const handleKanaRowChange = (newRow: KanaRow | null) => {
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				row: newRow ?? undefined,
				role: roleFilter,
				page: 1,
				view,
				search: search || undefined,
			},
		});
	};

	const handleRoleChange = (newRole: RoleType) => {
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				role: newRole,
				page: 1,
				view,
				search: search || undefined,
			},
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				role: roleFilter,
				page: newPage,
				view,
				search: search || undefined,
			},
		});
	};

	const handleViewChange = (newView: ViewMode) => {
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				role: roleFilter,
				page,
				view: newView,
				search: search || undefined,
			},
		});
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchInput(value);
		// IME変換中は検索を実行しない
		if (isComposingRef.current) return;
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				role: roleFilter,
				page: 1,
				view,
				search: value || undefined,
			},
		});
	};

	const handleCompositionStart = () => {
		isComposingRef.current = true;
	};

	const handleCompositionEnd = (
		e: React.CompositionEvent<HTMLInputElement>,
	) => {
		isComposingRef.current = false;
		const value = e.currentTarget.value;
		navigate({
			to: "/artists",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				role: roleFilter,
				page: 1,
				view,
				search: value || undefined,
			},
		});
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "アーティスト" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">アーティスト一覧</h1>
					<p className="mt-1 text-base-content/70">
						アーティスト · {formatNumber(total)}件
					</p>
				</div>
				<ViewToggle value={view} onChange={handleViewChange} />
			</div>

			{/* フィルター */}
			<div className="space-y-4">
				{/* キーワード検索 */}
				<div>
					<span className="mb-2 block font-medium text-sm">
						キーワード検索:
					</span>
					<SearchInput
						value={searchInput}
						onChange={handleSearchChange}
						onCompositionStart={handleCompositionStart}
						onCompositionEnd={handleCompositionEnd}
						placeholder="アーティスト名で検索..."
						size="sm"
						containerClassName="max-w-md"
					/>
				</div>

				{/* 役割フィルター */}
				<div>
					<span className="mb-2 block font-medium text-sm">役割:</span>
					<div className="flex flex-wrap gap-2">
						{ROLE_TYPES.map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => handleRoleChange(r)}
								className={`btn btn-sm ${
									roleFilter === r ? "btn-primary" : "btn-ghost border-base-300"
								}`}
								aria-pressed={roleFilter === r}
							>
								{roleConfig[r].label}
							</button>
						))}
					</div>
				</div>

				{/* 文字種フィルター（2段階） */}
				<div>
					<span className="mb-2 block font-medium text-sm">文字種:</span>
					<TwoStageScriptFilter
						scriptCategory={scriptCategory}
						alphabetInitial={alphabetInitial ?? null}
						kanaRow={kanaRow ?? null}
						onScriptCategoryChange={handleScriptCategoryChange}
						onAlphabetInitialChange={handleAlphabetInitialChange}
						onKanaRowChange={handleKanaRowChange}
					/>
				</div>
			</div>

			{/* アーティスト一覧 */}
			{artists.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当するアーティストがありません"
					description="フィルター条件を変更してお試しください"
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{artists.map((artist) => (
						<Link
							key={artist.id}
							to="/artists/$id"
							params={{ id: artist.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<div className="flex items-center gap-3">
									<div className="flex size-12 items-center justify-center rounded-full bg-accent/10">
										<Users className="size-6 text-accent" aria-hidden="true" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate font-bold text-base">
											{artist.name}
										</h3>
										{artist.name !== artist.artistName && (
											<p className="truncate text-base-content/50 text-sm">
												{artist.artistName}
											</p>
										)}
									</div>
								</div>
								{/* 役割バッジ */}
								<div className="mt-2 flex flex-wrap gap-1">
									{artist.roles.map((role) => (
										<span
											key={role.roleCode}
											className={`badge badge-sm ${getRoleBadgeClass(role.roleCode)}`}
										>
											{role.label}
										</span>
									))}
								</div>
								<div className="mt-3 flex items-center gap-4 text-base-content/70 text-sm">
									<span className="flex items-center gap-1">
										<Music className="size-4" aria-hidden="true" />
										{formatNumber(artist.trackCount)}曲
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="table">
						<thead>
							<tr>
								<th>アーティスト</th>
								<th>役割</th>
								<th>参加曲数</th>
							</tr>
						</thead>
						<tbody>
							{artists.map((artist) => (
								<tr key={artist.id} className="hover:bg-base-200/50">
									<td>
										<Link
											to="/artists/$id"
											params={{ id: artist.id }}
											className="flex items-center gap-3 hover:text-primary"
										>
											<div className="flex size-8 items-center justify-center rounded-full bg-accent/10">
												<Users
													className="size-4 text-accent"
													aria-hidden="true"
												/>
											</div>
											<div>
												<span className="font-medium">{artist.name}</span>
												{artist.name !== artist.artistName && (
													<div className="text-base-content/50 text-xs">
														{artist.artistName}
													</div>
												)}
											</div>
										</Link>
									</td>
									<td>
										<div className="flex gap-1">
											{artist.roles.map((role) => (
												<span
													key={role.roleCode}
													className={`badge badge-sm whitespace-nowrap ${getRoleBadgeClass(role.roleCode)}`}
												>
													{role.label}
												</span>
											))}
										</div>
									</td>
									<td className="text-base-content/70">
										{formatNumber(artist.trackCount)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* ページネーション */}
			{totalPages > 1 && (
				<Pagination
					currentPage={page}
					totalPages={totalPages}
					onPageChange={handlePageChange}
				/>
			)}
		</div>
	);
}
