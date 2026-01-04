import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Disc, Music, Users } from "lucide-react";
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
// URL パラメータの定義と検証
// =============================================================================

interface CirclesSearchParams {
	script?: ScriptCategory;
	initial?: string; // A-Z
	row?: string; // あ, か, さ...
	page?: number;
	view?: ViewMode;
}

export const Route = createFileRoute("/_public/circles")({
	component: CirclesPage,
	validateSearch: (search: Record<string, unknown>): CirclesSearchParams => {
		const script = parseScriptParam(search.script);
		return {
			script,
			initial:
				script === "alphabet" ? parseInitialParam(search.initial) : undefined,
			row: script === "kana" ? parseRowParam(search.row) : undefined,
			page: parsePageParam(search.page),
			view:
				search.view === "grid" || search.view === "list" ? search.view : "list",
		};
	},
});

// =============================================================================
// モックデータ（DBスキーマ準拠）
// =============================================================================

interface Circle {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string;
	nameInitial: string | null;
	initialScript: InitialScript;
	releaseCount: number;
	trackCount: number;
}

const mockCircles: Circle[] = [
	{
		id: "circle-iosys",
		name: "IOSYS",
		nameJa: "イオシス",
		nameEn: "IOSYS",
		sortName: "IOSYS",
		nameInitial: "I",
		initialScript: "latin",
		releaseCount: 156,
		trackCount: 1234,
	},
	{
		id: "circle-alstroemeria",
		name: "Alstroemeria Records",
		nameJa: "アルストロメリアレコーズ",
		nameEn: "Alstroemeria Records",
		sortName: "Alstroemeria Records",
		nameInitial: "A",
		initialScript: "latin",
		releaseCount: 89,
		trackCount: 892,
	},
	{
		id: "circle-sound-holic",
		name: "SOUND HOLIC",
		nameJa: "サウンドホリック",
		nameEn: "SOUND HOLIC",
		sortName: "SOUND HOLIC",
		nameInitial: "S",
		initialScript: "latin",
		releaseCount: 134,
		trackCount: 1567,
	},
	{
		id: "circle-butaotome",
		name: "豚乙女",
		nameJa: "豚乙女",
		nameEn: "Butaotome",
		sortName: "ぶたおとめ",
		nameInitial: null,
		initialScript: "kanji",
		releaseCount: 78,
		trackCount: 689,
	},
	{
		id: "circle-diao-ye-zong",
		name: "凋叶棕",
		nameJa: "凋叶棕",
		nameEn: "Diao ye zong",
		sortName: "てぃあおいえつぉん",
		nameInitial: null,
		initialScript: "kanji",
		releaseCount: 67,
		trackCount: 534,
	},
	{
		id: "circle-touhou-jihen",
		name: "東方事変",
		nameJa: "東方事変",
		nameEn: null,
		sortName: "とうほうじへん",
		nameInitial: null,
		initialScript: "kanji",
		releaseCount: 45,
		trackCount: 423,
	},
	{
		id: "circle-shinra-bansho",
		name: "森羅万象",
		nameJa: "森羅万象",
		nameEn: "Shinra-Bansho",
		sortName: "しんらばんしょう",
		nameInitial: null,
		initialScript: "kanji",
		releaseCount: 56,
		trackCount: 478,
	},
	{
		id: "circle-cool-and-create",
		name: "COOL&CREATE",
		nameJa: "クール&クリエイト",
		nameEn: "COOL&CREATE",
		sortName: "COOL&CREATE",
		nameInitial: "C",
		initialScript: "latin",
		releaseCount: 112,
		trackCount: 987,
	},
	{
		id: "circle-tamusic",
		name: "TAMusic",
		nameJa: "タミュージック",
		nameEn: "TAMusic",
		sortName: "TAMusic",
		nameInitial: "T",
		initialScript: "latin",
		releaseCount: 98,
		trackCount: 1123,
	},
	{
		id: "circle-sekken-ya",
		name: "石鹸屋",
		nameJa: "石鹸屋",
		nameEn: "Sekken-ya",
		sortName: "せっけんや",
		nameInitial: null,
		initialScript: "kanji",
		releaseCount: 34,
		trackCount: 312,
	},
	{
		id: "circle-demetori",
		name: "Demetori",
		nameJa: "デメトリ",
		nameEn: "Demetori",
		sortName: "Demetori",
		nameInitial: "D",
		initialScript: "latin",
		releaseCount: 23,
		trackCount: 234,
	},
	{
		id: "circle-silver-forest",
		name: "Silver Forest",
		nameJa: "シルバーフォレスト",
		nameEn: "Silver Forest",
		sortName: "Silver Forest",
		nameInitial: "S",
		initialScript: "latin",
		releaseCount: 45,
		trackCount: 389,
	},
	{
		id: "circle-a-one",
		name: "A-One",
		nameJa: "エーワン",
		nameEn: "A-One",
		sortName: "A-One",
		nameInitial: "A",
		initialScript: "latin",
		releaseCount: 87,
		trackCount: 756,
	},
	{
		id: "circle-7th-heaven-maxion",
		name: "7thHeaven MAXION",
		nameJa: "セブンスヘブンマキシオン",
		nameEn: "7thHeaven MAXION",
		sortName: "7thHeaven MAXION",
		nameInitial: null,
		initialScript: "digit",
		releaseCount: 42,
		trackCount: 398,
	},
	{
		id: "circle-ui70",
		name: "UI-70",
		nameJa: "ユーアイナナジュウ",
		nameEn: "UI-70",
		sortName: "UI-70",
		nameInitial: "U",
		initialScript: "latin",
		releaseCount: 31,
		trackCount: 287,
	},
	// かなで始まるサークルを追加
	{
		id: "circle-akatsuki-records",
		name: "暁Records",
		nameJa: "暁Records",
		nameEn: "Akatsuki Records",
		sortName: "あかつきれこーず",
		nameInitial: "あ",
		initialScript: "hiragana",
		releaseCount: 65,
		trackCount: 543,
	},
	{
		id: "circle-karuinori",
		name: "かるいノリ",
		nameJa: "かるいノリ",
		nameEn: null,
		sortName: "かるいのり",
		nameInitial: "か",
		initialScript: "hiragana",
		releaseCount: 12,
		trackCount: 98,
	},
	{
		id: "circle-sasakure-uk",
		name: "ささくれUK",
		nameJa: "ささくれUK",
		nameEn: "sasakure.UK",
		sortName: "ささくれゆーけー",
		nameInitial: "さ",
		initialScript: "hiragana",
		releaseCount: 8,
		trackCount: 72,
	},
	{
		id: "circle-tamaonsen",
		name: "たまおんせん",
		nameJa: "たまおんせん",
		nameEn: "Tama Onsen",
		sortName: "たまおんせん",
		nameInitial: "た",
		initialScript: "hiragana",
		releaseCount: 22,
		trackCount: 187,
	},
	{
		id: "circle-nanahira",
		name: "ナナヒラ",
		nameJa: "ナナヒラ",
		nameEn: "Nanahira",
		sortName: "ななひら",
		nameInitial: "な",
		initialScript: "katakana",
		releaseCount: 35,
		trackCount: 298,
	},
];

// =============================================================================
// コンポーネント
// =============================================================================

function CirclesPage() {
	const navigate = useNavigate();
	const {
		script = "all",
		initial,
		row,
		page = 1,
		view = "list",
	} = Route.useSearch();

	// 型安全なパラメータ
	const scriptCategory = script as ScriptCategory;
	const alphabetInitial = initial as AlphabetInitial | undefined;
	const kanaRow = row as KanaRow | undefined;

	// フィルタリング
	const filteredCircles = useMemo(() => {
		let result = mockCircles;

		// 1段目フィルター（initialScriptでフィルター）
		if (scriptCategory !== "all") {
			const scripts = getInitialScripts(scriptCategory);
			result = result.filter((circle) =>
				scripts.includes(circle.initialScript),
			);
		}

		// 2段目フィルター
		if (scriptCategory === "alphabet" && alphabetInitial) {
			result = result.filter(
				(circle) => circle.nameInitial?.toUpperCase() === alphabetInitial,
			);
		} else if (scriptCategory === "kana" && kanaRow) {
			result = result.filter((circle) =>
				isInKanaRow(circle.nameInitial, kanaRow),
			);
		}

		// リリース数で降順ソート
		return [...result].sort((a, b) => b.releaseCount - a.releaseCount);
	}, [scriptCategory, alphabetInitial, kanaRow]);

	// ページネーション
	const totalPages = calculateTotalPages(filteredCircles.length);
	const paginatedCircles = paginateData(filteredCircles, page);

	// ナビゲーションハンドラー
	const handleScriptCategoryChange = (newScript: ScriptCategory) => {
		navigate({
			to: "/circles",
			search: { script: newScript, page: 1, view },
		});
	};

	const handleAlphabetInitialChange = (newInitial: AlphabetInitial | null) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: newInitial ?? undefined,
				page: 1,
				view,
			},
		});
	};

	const handleKanaRowChange = (newRow: KanaRow | null) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				row: newRow ?? undefined,
				page: 1,
				view,
			},
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				page: newPage,
				view,
			},
		});
	};

	const handleViewChange = (newView: ViewMode) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				page,
				view: newView,
			},
		});
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "サークル" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">サークル一覧</h1>
					<p className="mt-1 text-base-content/70">
						同人サークル · {filteredCircles.length}件
					</p>
				</div>
				<ViewToggle value={view} onChange={handleViewChange} />
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

			{/* サークル一覧 */}
			{paginatedCircles.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当するサークルがありません"
					description="フィルター条件を変更してお試しください"
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{paginatedCircles.map((circle) => (
						<Link
							key={circle.id}
							to="/circles/$id"
							params={{ id: circle.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<div className="flex items-center gap-3">
									<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
										<Users className="size-6 text-primary" aria-hidden="true" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate font-bold text-base">
											{circle.name}
										</h3>
										<p className="truncate text-base-content/50 text-sm">
											{circle.sortName}
										</p>
									</div>
								</div>
								<div className="mt-3 flex items-center gap-4 text-base-content/70 text-sm">
									<span className="flex items-center gap-1">
										<Disc className="size-4" aria-hidden="true" />
										{circle.releaseCount}リリース
									</span>
									<span className="flex items-center gap-1">
										<Music className="size-4" aria-hidden="true" />
										{circle.trackCount}曲
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
								<th>サークル名</th>
								<th>読み</th>
								<th>リリース数</th>
								<th>曲数</th>
							</tr>
						</thead>
						<tbody>
							{paginatedCircles.map((circle) => (
								<tr key={circle.id} className="hover:bg-base-200/50">
									<td>
										<Link
											to="/circles/$id"
											params={{ id: circle.id }}
											className="flex items-center gap-3 hover:text-primary"
										>
											<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
												<Users
													className="size-4 text-primary"
													aria-hidden="true"
												/>
											</div>
											<span className="font-medium">{circle.name}</span>
										</Link>
									</td>
									<td className="text-base-content/70">{circle.sortName}</td>
									<td className="text-base-content/70">
										{circle.releaseCount}
									</td>
									<td className="text-base-content/70">{circle.trackCount}</td>
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
