import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Music, Users } from "lucide-react";
import { useMemo } from "react";
import {
	calculateTotalPages,
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	paginateData,
	TwoStageScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { isInKanaRow, type KanaRow } from "@/lib/kana-utils";
import {
	type AlphabetInitial,
	getInitialScripts,
	type InitialScript,
	parseInitialParam,
	parsePageParam,
	parseRowParam,
	parseScriptParam,
	type ScriptCategory,
} from "@/lib/script-filter-utils";

// =============================================================================
// 役割フィルター
// =============================================================================

type RoleType = "all" | "arrange" | "lyrics" | "vocal";

const ROLE_TYPES: readonly RoleType[] = [
	"all",
	"arrange",
	"lyrics",
	"vocal",
] as const;

interface RoleConfig {
	label: string;
	shortLabel: string;
	badgeClass: string;
}

const roleConfig: Record<RoleType, RoleConfig> = {
	all: { label: "すべて", shortLabel: "すべて", badgeClass: "" },
	arrange: { label: "編曲者", shortLabel: "編曲", badgeClass: "badge-primary" },
	lyrics: {
		label: "作詞者",
		shortLabel: "作詞",
		badgeClass: "badge-secondary",
	},
	vocal: { label: "ボーカル", shortLabel: "Vo", badgeClass: "badge-accent" },
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
}

export const Route = createFileRoute("/_public/artists")({
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
		};
	},
});

// =============================================================================
// モックデータ（DBスキーマ準拠）
// =============================================================================

interface Artist {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string;
	nameInitial: string | null;
	initialScript: InitialScript;
	roles: Exclude<RoleType, "all">[];
	trackCount: number;
	releaseCount: number;
}

const mockArtists: Artist[] = [
	{
		id: "arm",
		name: "ARM",
		nameJa: "ARM",
		nameEn: "ARM",
		sortName: "ARM",
		nameInitial: "A",
		initialScript: "latin",
		roles: ["arrange"],
		trackCount: 456,
		releaseCount: 78,
	},
	{
		id: "miko",
		name: "miko",
		nameJa: "みこ",
		nameEn: "miko",
		sortName: "miko",
		nameInitial: "M",
		initialScript: "latin",
		roles: ["vocal"],
		trackCount: 234,
		releaseCount: 45,
	},
	{
		id: "beatmario",
		name: "ビートまりお",
		nameJa: "ビートまりお",
		nameEn: "Beatmario",
		sortName: "びーとまりお",
		nameInitial: "ひ",
		initialScript: "katakana",
		roles: ["arrange", "vocal"],
		trackCount: 389,
		releaseCount: 67,
	},
	{
		id: "ranko",
		name: "ランコ",
		nameJa: "ランコ",
		nameEn: "Ranko",
		sortName: "らんこ",
		nameInitial: "ら",
		initialScript: "katakana",
		roles: ["vocal"],
		trackCount: 312,
		releaseCount: 56,
	},
	{
		id: "comp",
		name: "Comp",
		nameJa: "コンプ",
		nameEn: "Comp",
		sortName: "Comp",
		nameInitial: "C",
		initialScript: "latin",
		roles: ["arrange"],
		trackCount: 278,
		releaseCount: 42,
	},
	{
		id: "recog",
		name: "REDALiCE",
		nameJa: "レダリス",
		nameEn: "REDALiCE",
		sortName: "REDALiCE",
		nameInitial: "R",
		initialScript: "latin",
		roles: ["arrange"],
		trackCount: 423,
		releaseCount: 89,
	},
	{
		id: "nayuta",
		name: "ナユタ",
		nameJa: "ナユタ",
		nameEn: "Nayuta",
		sortName: "なゆた",
		nameInitial: "な",
		initialScript: "katakana",
		roles: ["vocal"],
		trackCount: 189,
		releaseCount: 34,
	},
	{
		id: "kouki",
		name: "幽閉サテライト",
		nameJa: "幽閉サテライト",
		nameEn: "Yuuhei Satellite",
		sortName: "ゆうへいさてらいと",
		nameInitial: null,
		initialScript: "kanji",
		roles: ["arrange", "lyrics"],
		trackCount: 567,
		releaseCount: 98,
	},
	{
		id: "zun",
		name: "ZUN",
		nameJa: "ZUN",
		nameEn: "ZUN",
		sortName: "ZUN",
		nameInitial: "Z",
		initialScript: "latin",
		roles: ["arrange"],
		trackCount: 789,
		releaseCount: 34,
	},
	{
		id: "marika",
		name: "まらしぃ",
		nameJa: "まらしぃ",
		nameEn: "Marasy",
		sortName: "まらしぃ",
		nameInitial: "ま",
		initialScript: "hiragana",
		roles: ["arrange"],
		trackCount: 234,
		releaseCount: 45,
	},
	{
		id: "senya",
		name: "せにゃ",
		nameJa: "せにゃ",
		nameEn: "Senya",
		sortName: "せにゃ",
		nameInitial: "せ",
		initialScript: "hiragana",
		roles: ["vocal", "lyrics"],
		trackCount: 298,
		releaseCount: 52,
	},
	{
		id: "merami",
		name: "めらみぽっぷ",
		nameJa: "めらみぽっぷ",
		nameEn: "Meramipop",
		sortName: "めらみぽっぷ",
		nameInitial: "め",
		initialScript: "hiragana",
		roles: ["vocal"],
		trackCount: 412,
		releaseCount: 78,
	},
	{
		id: "hachijo",
		name: "8-3",
		nameJa: "ハチサン",
		nameEn: "8-3",
		sortName: "8-3",
		nameInitial: null,
		initialScript: "digit",
		roles: ["arrange"],
		trackCount: 178,
		releaseCount: 29,
	},
	{
		id: "kissing",
		name: "Kissing the Mirror",
		nameJa: "キッシングザミラー",
		nameEn: "Kissing the Mirror",
		sortName: "Kissing the Mirror",
		nameInitial: "K",
		initialScript: "latin",
		roles: ["arrange", "vocal"],
		trackCount: 234,
		releaseCount: 41,
	},
	{
		id: "tamaonsen",
		name: "魂音泉",
		nameJa: "魂音泉",
		nameEn: "Tama Onsen",
		sortName: "たまおんせん",
		nameInitial: null,
		initialScript: "kanji",
		roles: ["arrange", "lyrics", "vocal"],
		trackCount: 523,
		releaseCount: 87,
	},
	{
		id: "yukina",
		name: "yukina",
		nameJa: "ゆきな",
		nameEn: "yukina",
		sortName: "yukina",
		nameInitial: "Y",
		initialScript: "latin",
		roles: ["vocal"],
		trackCount: 189,
		releaseCount: 32,
	},
	{
		id: "masayoshi",
		name: "Masayoshi Minoshima",
		nameJa: "みのしままさよし",
		nameEn: "Masayoshi Minoshima",
		sortName: "Masayoshi Minoshima",
		nameInitial: "M",
		initialScript: "latin",
		roles: ["arrange"],
		trackCount: 567,
		releaseCount: 89,
	},
	{
		id: "taishi",
		name: "タイシ",
		nameJa: "タイシ",
		nameEn: "Taishi",
		sortName: "たいし",
		nameInitial: "た",
		initialScript: "katakana",
		roles: ["arrange"],
		trackCount: 345,
		releaseCount: 56,
	},
	{
		id: "nachi",
		name: "nachi",
		nameJa: "なち",
		nameEn: "nachi",
		sortName: "nachi",
		nameInitial: "N",
		initialScript: "latin",
		roles: ["vocal"],
		trackCount: 276,
		releaseCount: 48,
	},
	{
		id: "azuki",
		name: "あずき",
		nameJa: "あずき",
		nameEn: "Azuki",
		sortName: "あずき",
		nameInitial: "あ",
		initialScript: "hiragana",
		roles: ["vocal", "lyrics"],
		trackCount: 223,
		releaseCount: 41,
	},
];

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
	} = Route.useSearch();

	// 型安全なパラメータ
	const scriptCategory = script as ScriptCategory;
	const alphabetInitial = initial as AlphabetInitial | undefined;
	const kanaRow = row as KanaRow | undefined;
	const roleFilter = role as RoleType;

	// フィルタリング
	const filteredArtists = useMemo(() => {
		let result = mockArtists;

		// 1段目フィルター（initialScriptでフィルター）
		if (scriptCategory !== "all") {
			const scripts = getInitialScripts(scriptCategory);
			result = result.filter((artist) =>
				scripts.includes(artist.initialScript),
			);
		}

		// 2段目フィルター
		if (scriptCategory === "alphabet" && alphabetInitial) {
			result = result.filter(
				(artist) => artist.nameInitial?.toUpperCase() === alphabetInitial,
			);
		} else if (scriptCategory === "kana" && kanaRow) {
			result = result.filter((artist) =>
				isInKanaRow(artist.nameInitial, kanaRow),
			);
		}

		// 役割フィルター
		if (roleFilter !== "all") {
			result = result.filter((artist) => artist.roles.includes(roleFilter));
		}

		// トラック数で降順ソート
		return [...result].sort((a, b) => b.trackCount - a.trackCount);
	}, [scriptCategory, alphabetInitial, kanaRow, roleFilter]);

	// ページネーション
	const totalPages = calculateTotalPages(filteredArtists.length);
	const paginatedArtists = paginateData(filteredArtists, page);

	// ナビゲーションハンドラー
	const handleScriptCategoryChange = (newScript: ScriptCategory) => {
		navigate({
			to: "/artists",
			search: { script: newScript, role: roleFilter, page: 1, view },
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
						アーティスト · {filteredArtists.length}件
					</p>
				</div>
				<ViewToggle value={view} onChange={handleViewChange} />
			</div>

			{/* フィルター */}
			<div className="space-y-4">
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
			{paginatedArtists.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当するアーティストがありません"
					description="フィルター条件を変更してお試しください"
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{paginatedArtists.map((artist) => (
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
										<p className="truncate text-base-content/50 text-sm">
											{artist.sortName}
										</p>
									</div>
								</div>
								{/* 役割バッジ */}
								<div className="mt-2 flex flex-wrap gap-1">
									{artist.roles.map((r) => (
										<span
											key={r}
											className={`badge badge-sm ${roleConfig[r].badgeClass}`}
										>
											{roleConfig[r].shortLabel}
										</span>
									))}
								</div>
								<div className="mt-3 flex items-center gap-4 text-base-content/70 text-sm">
									<span className="flex items-center gap-1">
										<Music className="size-4" aria-hidden="true" />
										{artist.trackCount}曲
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
								<th>アーティスト名</th>
								<th>読み</th>
								<th>役割</th>
								<th>参加曲数</th>
							</tr>
						</thead>
						<tbody>
							{paginatedArtists.map((artist) => (
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
											<span className="font-medium">{artist.name}</span>
										</Link>
									</td>
									<td className="text-base-content/70">{artist.sortName}</td>
									<td>
										<div className="flex flex-wrap gap-1">
											{artist.roles.map((r) => (
												<span
													key={r}
													className={`badge badge-sm ${roleConfig[r].badgeClass}`}
												>
													{roleConfig[r].shortLabel}
												</span>
											))}
										</div>
									</td>
									<td className="text-base-content/70">{artist.trackCount}</td>
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
