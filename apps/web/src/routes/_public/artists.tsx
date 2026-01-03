import { createFileRoute, Link } from "@tanstack/react-router";
import { Music, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
	PublicBreadcrumb,
	type ScriptCategory,
	ScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";

export const Route = createFileRoute("/_public/artists")({
	component: ArtistsPage,
});

const STORAGE_KEY_VIEW = "artists-view-mode";
const STORAGE_KEY_SCRIPT = "artists-script-filter";
const STORAGE_KEY_ROLE = "artists-role-filter";

type RoleType = "all" | "arrange" | "lyrics" | "vocal";

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

function getInitialViewMode(): ViewMode {
	if (typeof window === "undefined") return "grid";
	return (localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode) || "grid";
}

function getInitialScriptFilter(): ScriptCategory {
	if (typeof window === "undefined") return "all";
	return (localStorage.getItem(STORAGE_KEY_SCRIPT) as ScriptCategory) || "all";
}

function getInitialRoleFilter(): RoleType {
	if (typeof window === "undefined") return "all";
	return (localStorage.getItem(STORAGE_KEY_ROLE) as RoleType) || "all";
}

interface Artist {
	id: string;
	name: string;
	nameReading: string;
	roles: Exclude<RoleType, "all">[];
	trackCount: number;
	releaseCount: number;
	scriptCategory: Exclude<ScriptCategory, "all">;
}

// モックデータ
const mockArtists: Artist[] = [
	{
		id: "arm",
		name: "ARM",
		nameReading: "あーむ",
		roles: ["arrange"],
		trackCount: 456,
		releaseCount: 78,
		scriptCategory: "alphabet",
	},
	{
		id: "miko",
		name: "miko",
		nameReading: "みこ",
		roles: ["vocal"],
		trackCount: 234,
		releaseCount: 45,
		scriptCategory: "alphabet",
	},
	{
		id: "beatmario",
		name: "ビートまりお",
		nameReading: "びーとまりお",
		roles: ["arrange", "vocal"],
		trackCount: 389,
		releaseCount: 67,
		scriptCategory: "kana",
	},
	{
		id: "ranko",
		name: "ランコ",
		nameReading: "らんこ",
		roles: ["vocal"],
		trackCount: 312,
		releaseCount: 56,
		scriptCategory: "kana",
	},
	{
		id: "comp",
		name: "Comp",
		nameReading: "こんぷ",
		roles: ["arrange"],
		trackCount: 278,
		releaseCount: 42,
		scriptCategory: "alphabet",
	},
	{
		id: "recog",
		name: "REDALiCE",
		nameReading: "れだりす",
		roles: ["arrange"],
		trackCount: 423,
		releaseCount: 89,
		scriptCategory: "alphabet",
	},
	{
		id: "nayuta",
		name: "ナユタ",
		nameReading: "なゆた",
		roles: ["vocal"],
		trackCount: 189,
		releaseCount: 34,
		scriptCategory: "kana",
	},
	{
		id: "kouki",
		name: "幽閉サテライト",
		nameReading: "ゆうへいさてらいと",
		roles: ["arrange", "lyrics"],
		trackCount: 567,
		releaseCount: 98,
		scriptCategory: "kanji",
	},
	{
		id: "zun",
		name: "ZUN",
		nameReading: "ずん",
		roles: ["arrange"],
		trackCount: 789,
		releaseCount: 34,
		scriptCategory: "alphabet",
	},
	{
		id: "marika",
		name: "まらしぃ",
		nameReading: "まらしぃ",
		roles: ["arrange"],
		trackCount: 234,
		releaseCount: 45,
		scriptCategory: "kana",
	},
	{
		id: "senya",
		name: "せにゃ",
		nameReading: "せにゃ",
		roles: ["vocal", "lyrics"],
		trackCount: 298,
		releaseCount: 52,
		scriptCategory: "kana",
	},
	{
		id: "merami",
		name: "めらみぽっぷ",
		nameReading: "めらみぽっぷ",
		roles: ["vocal"],
		trackCount: 412,
		releaseCount: 78,
		scriptCategory: "kana",
	},
	{
		id: "hachijo",
		name: "8-3",
		nameReading: "はちさん",
		roles: ["arrange"],
		trackCount: 178,
		releaseCount: 29,
		scriptCategory: "symbol",
	},
	{
		id: "kissing",
		name: "Kissing the Mirror",
		nameReading: "きっしんぐざみらー",
		roles: ["arrange", "vocal"],
		trackCount: 234,
		releaseCount: 41,
		scriptCategory: "alphabet",
	},
	{
		id: "tamaonsen",
		name: "魂音泉",
		nameReading: "たまおんせん",
		roles: ["arrange", "lyrics", "vocal"],
		trackCount: 523,
		releaseCount: 87,
		scriptCategory: "kanji",
	},
	{
		id: "yukina",
		name: "yukina",
		nameReading: "ゆきな",
		roles: ["vocal"],
		trackCount: 189,
		releaseCount: 32,
		scriptCategory: "alphabet",
	},
	{
		id: "masayoshi",
		name: "Masayoshi Minoshima",
		nameReading: "みのしままさよし",
		roles: ["arrange"],
		trackCount: 567,
		releaseCount: 89,
		scriptCategory: "alphabet",
	},
	{
		id: "taishi",
		name: "タイシ",
		nameReading: "たいし",
		roles: ["arrange"],
		trackCount: 345,
		releaseCount: 56,
		scriptCategory: "kana",
	},
	{
		id: "nachi",
		name: "nachi",
		nameReading: "なち",
		roles: ["vocal"],
		trackCount: 276,
		releaseCount: 48,
		scriptCategory: "alphabet",
	},
	{
		id: "azuki",
		name: "あずき",
		nameReading: "あずき",
		roles: ["vocal", "lyrics"],
		trackCount: 223,
		releaseCount: 41,
		scriptCategory: "kana",
	},
];

function ArtistsPage() {
	const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);
	const [scriptFilter, setScriptFilterState] = useState<ScriptCategory>(
		getInitialScriptFilter,
	);
	const [roleFilter, setRoleFilterState] =
		useState<RoleType>(getInitialRoleFilter);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	const setScriptFilter = (script: ScriptCategory) => {
		setScriptFilterState(script);
		localStorage.setItem(STORAGE_KEY_SCRIPT, script);
	};

	const setRoleFilter = (role: RoleType) => {
		setRoleFilterState(role);
		localStorage.setItem(STORAGE_KEY_ROLE, role);
	};

	const filteredArtists = useMemo(() => {
		let artists = mockArtists;

		// 文字種フィルター
		if (scriptFilter !== "all") {
			artists = artists.filter(
				(artist) => artist.scriptCategory === scriptFilter,
			);
		}

		// 役割フィルター
		if (roleFilter !== "all") {
			artists = artists.filter((artist) => artist.roles.includes(roleFilter));
		}

		// トラック数で降順ソート
		return [...artists].sort((a, b) => b.trackCount - a.trackCount);
	}, [scriptFilter, roleFilter]);

	const roleFilterOptions: RoleType[] = ["all", "arrange", "lyrics", "vocal"];

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
				<ViewToggle value={viewMode} onChange={setViewMode} />
			</div>

			{/* フィルター */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-8">
				{/* 文字種フィルター */}
				<div>
					<span className="mb-2 block font-medium text-sm">文字種:</span>
					<ScriptFilter value={scriptFilter} onChange={setScriptFilter} />
				</div>

				{/* 役割フィルター */}
				<div>
					<span className="mb-2 block font-medium text-sm">役割:</span>
					<div className="flex flex-wrap gap-2">
						{roleFilterOptions.map((role) => (
							<button
								key={role}
								type="button"
								onClick={() => setRoleFilter(role)}
								className={`btn btn-sm ${
									roleFilter === role
										? "btn-primary"
										: "btn-ghost border-base-300"
								}`}
								aria-pressed={roleFilter === role}
							>
								{roleConfig[role].label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* アーティスト一覧 */}
			{viewMode === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredArtists.map((artist) => (
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
											{artist.nameReading}
										</p>
									</div>
								</div>
								{/* 役割バッジ */}
								<div className="mt-2 flex flex-wrap gap-1">
									{artist.roles.map((role) => (
										<span
											key={role}
											className={`badge badge-sm ${roleConfig[role].badgeClass}`}
										>
											{roleConfig[role].shortLabel}
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
							{filteredArtists.map((artist) => (
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
									<td className="text-base-content/70">{artist.nameReading}</td>
									<td>
										<div className="flex flex-wrap gap-1">
											{artist.roles.map((role) => (
												<span
													key={role}
													className={`badge badge-sm ${roleConfig[role].badgeClass}`}
												>
													{roleConfig[role].shortLabel}
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
		</div>
	);
}
