import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, ExternalLink, Music, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
	EmptyState,
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { createPublicCircleHead } from "@/lib/head";

// モックサークル取得関数（loader用）
function getCircle(id: string) {
	return mockCircles[id] ?? null;
}

export const Route = createFileRoute("/_public/circles_/$id")({
	loader: ({ params }) => ({ circle: getCircle(params.id) }),
	head: ({ loaderData }) => createPublicCircleHead(loaderData?.circle?.name),
	component: CircleDetailPage,
});

const STORAGE_KEY_VIEW = "circle-detail-view-mode";

// サークルデータ型（スキーマ準拠）
interface Circle {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	notes: string | null;
}

// 外部リンクデータ型
interface CircleLink {
	id: string;
	circleId: string;
	platformCode: string;
	url: string;
	isOfficial: boolean;
	isPrimary: boolean;
}

// リリースデータ型
interface Release {
	id: string;
	name: string;
	nameJa: string | null;
	releaseDate: string | null;
	releaseType: string | null;
	participationType: string;
	event: {
		id: string;
		name: string;
	} | null;
	trackCount: number;
}

// トラックデータ型
interface Track {
	id: string;
	name: string;
	releaseId: string;
	releaseName: string;
	trackNumber: number;
	artists: Array<{
		id: string;
		creditName: string;
		roles: string[];
	}>;
	originalSong: {
		id: string;
		name: string;
	} | null;
}

// モックデータ - サークル
const mockCircles: Record<string, Circle> = {
	"circle-iosys": {
		id: "circle-iosys",
		name: "IOSYS",
		nameJa: "イオシス",
		nameEn: "IOSYS",
		sortName: "IOSYS",
		nameInitial: "I",
		initialScript: "latin",
		notes: "2000年設立の同人音楽サークル。東方アレンジの先駆者的存在。",
	},
	"circle-alst": {
		id: "circle-alst",
		name: "Alstroemeria Records",
		nameJa: null,
		nameEn: "Alstroemeria Records",
		sortName: "Alstroemeria Records",
		nameInitial: "A",
		initialScript: "latin",
		notes: "Masayoshi Minoshima主宰の同人音楽サークル。",
	},
	"circle-cool": {
		id: "circle-cool",
		name: "COOL&CREATE",
		nameJa: null,
		nameEn: "COOL&CREATE",
		sortName: "COOL&CREATE",
		nameInitial: "C",
		initialScript: "latin",
		notes: "ビートまりお主宰のサークル。",
	},
};

// モックデータ - 外部リンク
const mockCircleLinks: Record<string, CircleLink[]> = {
	"circle-iosys": [
		{
			id: "cl-1",
			circleId: "circle-iosys",
			platformCode: "twitter",
			url: "https://twitter.com/iosys_info",
			isOfficial: true,
			isPrimary: true,
		},
		{
			id: "cl-2",
			circleId: "circle-iosys",
			platformCode: "official",
			url: "https://www.iosysos.com/",
			isOfficial: true,
			isPrimary: false,
		},
		{
			id: "cl-3",
			circleId: "circle-iosys",
			platformCode: "youtube",
			url: "https://www.youtube.com/@iosys_official",
			isOfficial: true,
			isPrimary: false,
		},
	],
};

// モックデータ - リリース（mocks/release.tsと統一されたID）
const mockReleases: Record<string, Release[]> = {
	"circle-iosys": [
		{
			id: "rel-iosys-001",
			name: "東方乙女囃子",
			nameJa: "東方乙女囃子",
			releaseDate: "2006-12-31",
			releaseType: "album",
			participationType: "host",
			event: { id: "c71", name: "C71" },
			trackCount: 4,
		},
		{
			id: "rel-single-001",
			name: "チルノのパーフェクトさんすう教室",
			nameJa: "チルノのパーフェクトさんすう教室",
			releaseDate: "2008-08-16",
			releaseType: "single",
			participationType: "host",
			event: { id: "c74", name: "C74" },
			trackCount: 1,
		},
	],
};

// モックデータ - トラック（mocks/release.tsと統一されたID）
const mockTracks: Record<string, Track[]> = {
	"circle-iosys": [
		{
			id: "track-001",
			name: "最終鬼畜妹フランドール・S",
			releaseId: "rel-iosys-001",
			releaseName: "東方乙女囃子",
			trackNumber: 1,
			artists: [
				{ id: "artist-arm", creditName: "ARM", roles: ["arrange", "lyrics"] },
				{ id: "artist-miko", creditName: "miko", roles: ["vocal"] },
			],
			originalSong: { id: "02010015", name: "U.N.オーエンは彼女なのか？" },
		},
		{
			id: "track-002",
			name: "魔理沙は大変なものを盗んでいきました",
			releaseId: "rel-iosys-001",
			releaseName: "東方乙女囃子",
			trackNumber: 2,
			artists: [
				{ id: "artist-arm", creditName: "ARM", roles: ["arrange", "lyrics"] },
				{ id: "artist-fu-rin", creditName: "藤咲かりん", roles: ["vocal"] },
			],
			originalSong: { id: "02010008", name: "人形裁判 ～ 人の形弄びし少女" },
		},
		{
			id: "track-003",
			name: "患部で止まってすぐ溶ける ～ 狂気の優曇華院",
			releaseId: "rel-iosys-001",
			releaseName: "東方乙女囃子",
			trackNumber: 3,
			artists: [
				{ id: "artist-arm", creditName: "ARM", roles: ["arrange", "lyrics"] },
				{ id: "artist-uno", creditName: "uno", roles: ["vocal"] },
			],
			originalSong: {
				id: "02080008",
				name: "狂気の瞳　～ Invisible Full Moon",
			},
		},
		{
			id: "track-single-001",
			name: "チルノのパーフェクトさんすう教室",
			releaseId: "rel-single-001",
			releaseName: "チルノのパーフェクトさんすう教室",
			trackNumber: 1,
			artists: [
				{ id: "artist-arm", creditName: "ARM", roles: ["arrange", "lyrics"] },
				{ id: "artist-miko", creditName: "miko", roles: ["vocal"] },
			],
			originalSong: { id: "02020004", name: "おてんば恋娘" },
		},
	],
};

// プラットフォーム名
const platformNames: Record<string, string> = {
	twitter: "X (Twitter)",
	official: "公式サイト",
	youtube: "YouTube",
	niconico: "ニコニコ",
	booth: "BOOTH",
	bandcamp: "Bandcamp",
};

// 役割名
const roleNames: Record<string, string> = {
	arrange: "編曲",
	compose: "作曲",
	lyrics: "作詞",
	vocal: "Vo",
};

// 参加種別名
const participationTypeNames: Record<string, string> = {
	host: "主催",
	"co-host": "共催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

// タブ型
type TabType = "releases" | "tracks";

function CircleDetailPage() {
	const { id } = Route.useParams();
	const { circle } = Route.useLoaderData();
	const [activeTab, setActiveTab] = useState<TabType>("releases");
	const [viewMode, setViewModeState] = useState<ViewMode>("list");

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode;
		if (saved) setViewModeState(saved);
	}, []);

	const setViewMode = (view: ViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};
	const links = mockCircleLinks[id] || [];
	const releases = mockReleases[id] || [];
	const tracks = mockTracks[id] || [];

	// 統計計算
	const stats = {
		releaseCount: releases.length,
		trackCount: tracks.length,
	};

	// サークルが見つからない場合
	if (!circle) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "サークル", href: "/circles" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">サークルが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのサークルは存在しません
					</p>
					<Link to="/circles" className="btn btn-primary mt-4">
						サークル一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "サークル", href: "/circles" },
					{ label: circle.name },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							{/* アバター */}
							<div className="flex size-16 items-center justify-center rounded-full bg-primary/10 font-bold text-2xl text-primary">
								{circle.nameInitial || circle.name.charAt(0)}
							</div>
							<div>
								<h1 className="font-bold text-2xl sm:text-3xl">
									{circle.name}
								</h1>
								{circle.nameJa && circle.nameJa !== circle.name && (
									<p className="text-base-content/70">{circle.nameJa}</p>
								)}
							</div>
						</div>
						{circle.notes && (
							<p className="text-base-content/60 text-sm">{circle.notes}</p>
						)}
					</div>

					{/* 外部リンク */}
					{links.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{links.map((link) => (
								<a
									key={link.id}
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									className="btn btn-outline btn-sm gap-1"
								>
									<ExternalLink className="size-3" />
									{platformNames[link.platformCode] || link.platformCode}
								</a>
							))}
						</div>
					)}
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-2 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">{stats.releaseCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">{stats.trackCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック</p>
					</div>
				</div>
			</div>

			{/* タブ */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div role="tablist" className="tabs tabs-boxed w-fit">
					<button
						type="button"
						role="tab"
						className={`tab ${activeTab === "releases" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("releases")}
					>
						リリース一覧
					</button>
					<button
						type="button"
						role="tab"
						className={`tab ${activeTab === "tracks" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("tracks")}
					>
						曲一覧
					</button>
				</div>
				{activeTab === "releases" && (
					<ViewToggle value={viewMode} onChange={setViewMode} />
				)}
			</div>

			{/* リリース一覧 */}
			{activeTab === "releases" &&
				(releases.length === 0 ? (
					<EmptyState type="empty" title="リリースがありません" />
				) : viewMode === "grid" ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{releases.map((release) => (
							<div
								key={release.id}
								className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
							>
								<div className="card-body p-4">
									<Link
										to="/releases/$id"
										params={{ id: release.id }}
										className="card-title text-base hover:text-primary"
									>
										{release.name}
									</Link>
									<div className="flex flex-wrap items-center gap-2 text-base-content/60 text-sm">
										{release.event && (
											<Link
												to="/events/$id"
												params={{ id: release.event.id }}
												className="badge badge-outline badge-sm hover:badge-primary"
											>
												{release.event.name}
											</Link>
										)}
										<span
											className={`badge badge-sm ${
												release.participationType === "host"
													? "badge-primary"
													: "badge-ghost"
											}`}
										>
											{participationTypeNames[release.participationType] ||
												release.participationType}
										</span>
									</div>
									<div className="mt-2 flex items-center gap-4 text-base-content/50 text-sm">
										{release.releaseDate && (
											<span className="flex items-center gap-1">
												<Calendar className="size-3" />
												{release.releaseDate}
											</span>
										)}
										<span className="flex items-center gap-1">
											<Music className="size-3" />
											{release.trackCount}曲
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>タイトル</th>
									<th>イベント</th>
									<th className="hidden sm:table-cell">参加種別</th>
									<th className="hidden sm:table-cell">発売日</th>
									<th>曲数</th>
								</tr>
							</thead>
							<tbody>
								{releases.map((release) => (
									<tr key={release.id} className="hover:bg-base-200/50">
										<td>
											<Link
												to="/releases/$id"
												params={{ id: release.id }}
												className="font-medium hover:text-primary"
											>
												{release.name}
											</Link>
										</td>
										<td>
											{release.event ? (
												<Link
													to="/events/$id"
													params={{ id: release.event.id }}
													className="hover:text-primary"
												>
													{release.event.name}
												</Link>
											) : (
												"-"
											)}
										</td>
										<td className="hidden sm:table-cell">
											<span
												className={`badge badge-sm ${
													release.participationType === "host"
														? "badge-primary"
														: "badge-ghost"
												}`}
											>
												{participationTypeNames[release.participationType] ||
													release.participationType}
											</span>
										</td>
										<td className="hidden text-base-content/70 sm:table-cell">
											{release.releaseDate || "-"}
										</td>
										<td className="text-base-content/70">
											{release.trackCount}曲
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				))}

			{/* トラック一覧 */}
			{activeTab === "tracks" &&
				(tracks.length === 0 ? (
					<EmptyState type="empty" title="トラックがありません" />
				) : (
					<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>曲名</th>
									<th>リリース</th>
									<th className="hidden md:table-cell">アーティスト</th>
									<th className="hidden sm:table-cell">原曲</th>
								</tr>
							</thead>
							<tbody>
								{tracks.map((track) => (
									<tr key={track.id} className="hover:bg-base-200/50">
										<td>
											<div className="font-medium">{track.name}</div>
										</td>
										<td className="text-base-content/70">
											{track.releaseName}
										</td>
										<td className="hidden md:table-cell">
											<div className="flex flex-wrap gap-1">
												{track.artists.map((artist) => (
													<Link
														key={artist.id}
														to="/artists/$id"
														params={{ id: artist.id }}
														className="inline-flex items-center gap-1 hover:text-primary"
													>
														<Users className="size-3" />
														<span>{artist.creditName}</span>
														<span className="text-base-content/50 text-xs">
															(
															{artist.roles
																.map((r) => roleNames[r] || r)
																.join("/")}
															)
														</span>
													</Link>
												))}
											</div>
										</td>
										<td className="hidden sm:table-cell">
											{track.originalSong ? (
												<Link
													to="/original-songs/$id"
													params={{ id: track.originalSong.id }}
													className="text-base-content/70 hover:text-primary"
												>
													{track.originalSong.name}
												</Link>
											) : (
												"-"
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				))}
		</div>
	);
}
