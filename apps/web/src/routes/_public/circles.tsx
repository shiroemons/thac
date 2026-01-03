import { createFileRoute, Link } from "@tanstack/react-router";
import { Disc, Music, Users } from "lucide-react";
import { useState } from "react";
import {
	PublicBreadcrumb,
	type ScriptCategory,
	ScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";

export const Route = createFileRoute("/_public/circles")({
	component: CirclesPage,
});

const STORAGE_KEY_VIEW = "circles-view-mode";
const STORAGE_KEY_SCRIPT = "circles-script-filter";

function getInitialViewMode(): ViewMode {
	if (typeof window === "undefined") return "grid";
	return (localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode) || "grid";
}

function getInitialScriptFilter(): ScriptCategory {
	if (typeof window === "undefined") return "all";
	return (localStorage.getItem(STORAGE_KEY_SCRIPT) as ScriptCategory) || "all";
}

interface Circle {
	id: string;
	name: string;
	nameReading: string;
	releaseCount: number;
	trackCount: number;
	scriptCategory: Exclude<ScriptCategory, "all">;
}

// モックデータ
const mockCircles: Circle[] = [
	{
		id: "iosys",
		name: "IOSYS",
		nameReading: "いおしす",
		releaseCount: 156,
		trackCount: 1234,
		scriptCategory: "alphabet",
	},
	{
		id: "alstroemeria",
		name: "Alstroemeria Records",
		nameReading: "あるすとろめりあれこーず",
		releaseCount: 89,
		trackCount: 892,
		scriptCategory: "alphabet",
	},
	{
		id: "sound-holic",
		name: "SOUND HOLIC",
		nameReading: "さうんどほりっく",
		releaseCount: 134,
		trackCount: 1567,
		scriptCategory: "alphabet",
	},
	{
		id: "butaotome",
		name: "豚乙女",
		nameReading: "ぶたおとめ",
		releaseCount: 78,
		trackCount: 689,
		scriptCategory: "kanji",
	},
	{
		id: "diao-ye-zong",
		name: "凋叶棕",
		nameReading: "てぃあおいえつぉん",
		releaseCount: 67,
		trackCount: 534,
		scriptCategory: "kanji",
	},
	{
		id: "touhou-jihen",
		name: "東方事変",
		nameReading: "とうほうじへん",
		releaseCount: 45,
		trackCount: 423,
		scriptCategory: "kanji",
	},
	{
		id: "shinra-bansho",
		name: "森羅万象",
		nameReading: "しんらばんしょう",
		releaseCount: 56,
		trackCount: 478,
		scriptCategory: "kanji",
	},
	{
		id: "cool-and-create",
		name: "COOL&CREATE",
		nameReading: "くーるあんどくりえいと",
		releaseCount: 112,
		trackCount: 987,
		scriptCategory: "alphabet",
	},
	{
		id: "tamusic",
		name: "TAMusic",
		nameReading: "たみゅーじっく",
		releaseCount: 98,
		trackCount: 1123,
		scriptCategory: "alphabet",
	},
	{
		id: "sekken-ya",
		name: "石鹸屋",
		nameReading: "せっけんや",
		releaseCount: 34,
		trackCount: 312,
		scriptCategory: "kanji",
	},
	{
		id: "demetori",
		name: "Demetori",
		nameReading: "でめとり",
		releaseCount: 23,
		trackCount: 234,
		scriptCategory: "alphabet",
	},
	{
		id: "silver-forest",
		name: "Silver Forest",
		nameReading: "しるばーふぉれすと",
		releaseCount: 45,
		trackCount: 389,
		scriptCategory: "alphabet",
	},
	{
		id: "a-one",
		name: "A-One",
		nameReading: "えーわん",
		releaseCount: 87,
		trackCount: 756,
		scriptCategory: "alphabet",
	},
	{
		id: "7th-heaven-maxion",
		name: "7thHeaven MAXION",
		nameReading: "せぶんすへぶんまきしおん",
		releaseCount: 42,
		trackCount: 398,
		scriptCategory: "symbol",
	},
	{
		id: "ui70",
		name: "UI-70",
		nameReading: "ゆーあいななじゅう",
		releaseCount: 31,
		trackCount: 287,
		scriptCategory: "alphabet",
	},
];

function CirclesPage() {
	const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);
	const [scriptFilter, setScriptFilterState] = useState<ScriptCategory>(
		getInitialScriptFilter,
	);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	const setScriptFilter = (script: ScriptCategory) => {
		setScriptFilterState(script);
		localStorage.setItem(STORAGE_KEY_SCRIPT, script);
	};

	const filteredCircles =
		scriptFilter === "all"
			? mockCircles
			: mockCircles.filter((circle) => circle.scriptCategory === scriptFilter);

	// リリース数で降順ソート
	const sortedCircles = [...filteredCircles].sort(
		(a, b) => b.releaseCount - a.releaseCount,
	);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "サークル" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">サークル一覧</h1>
					<p className="mt-1 text-base-content/70">
						同人サークル · {sortedCircles.length}件
					</p>
				</div>
				<ViewToggle value={viewMode} onChange={setViewMode} />
			</div>

			{/* 文字種フィルター */}
			<div>
				<span className="mb-2 block font-medium text-sm">文字種:</span>
				<ScriptFilter value={scriptFilter} onChange={setScriptFilter} />
			</div>

			{/* サークル一覧 */}
			{viewMode === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{sortedCircles.map((circle) => (
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
											{circle.nameReading}
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
							{sortedCircles.map((circle) => (
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
									<td className="text-base-content/70">{circle.nameReading}</td>
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
		</div>
	);
}
