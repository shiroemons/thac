import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Disc3, MapPin, Music, Users } from "lucide-react";
import { useState } from "react";
import {
	PublicBreadcrumb,
	type ViewMode,
	ViewToggle,
} from "@/components/public";

export const Route = createFileRoute("/_public/events_/$id")({
	component: EventDetailPage,
});

// イベントデータ型（スキーマ準拠）
interface Event {
	id: string;
	eventSeriesId: string;
	name: string;
	edition: number | null;
	totalDays: number | null;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
}

// イベントシリーズデータ型
interface EventSeries {
	id: string;
	name: string;
	sortOrder: number;
}

// イベント日データ型
interface EventDay {
	id: string;
	eventId: string;
	dayNumber: number;
	date: string;
}

// リリースデータ型
interface Release {
	id: string;
	name: string;
	releaseDate: string | null;
	releaseType: string | null;
	circles: Array<{
		id: string;
		name: string;
		participationType: string;
	}>;
	trackCount: number;
}

// モックデータ - イベント
const mockEvents: Record<string, Event> = {
	c105: {
		id: "c105",
		eventSeriesId: "series-comiket",
		name: "C105",
		edition: 105,
		totalDays: 3,
		venue: "東京ビッグサイト",
		startDate: "2024-12-28",
		endDate: "2024-12-30",
	},
	c104: {
		id: "c104",
		eventSeriesId: "series-comiket",
		name: "C104",
		edition: 104,
		totalDays: 2,
		venue: "東京ビッグサイト",
		startDate: "2024-08-11",
		endDate: "2024-08-12",
	},
	reitaisai21: {
		id: "reitaisai21",
		eventSeriesId: "series-reitaisai",
		name: "博麗神社例大祭21",
		edition: 21,
		totalDays: 1,
		venue: "東京ビッグサイト",
		startDate: "2024-05-19",
		endDate: "2024-05-19",
	},
};

// モックデータ - イベントシリーズ
const mockEventSeries: Record<string, EventSeries> = {
	"series-comiket": {
		id: "series-comiket",
		name: "コミックマーケット",
		sortOrder: 1,
	},
	"series-reitaisai": {
		id: "series-reitaisai",
		name: "博麗神社例大祭",
		sortOrder: 2,
	},
};

// モックデータ - イベント日
const mockEventDays: Record<string, EventDay[]> = {
	c105: [
		{ id: "day-1", eventId: "c105", dayNumber: 1, date: "2024-12-28" },
		{ id: "day-2", eventId: "c105", dayNumber: 2, date: "2024-12-29" },
		{ id: "day-3", eventId: "c105", dayNumber: 3, date: "2024-12-30" },
	],
	c104: [
		{ id: "day-1", eventId: "c104", dayNumber: 1, date: "2024-08-11" },
		{ id: "day-2", eventId: "c104", dayNumber: 2, date: "2024-08-12" },
	],
};

// モックデータ - リリース
const mockReleases: Record<string, Release[]> = {
	c105: [
		{
			id: "rel-1",
			name: "東方幻想郷2024",
			releaseDate: "2024-12-30",
			releaseType: "album",
			circles: [
				{ id: "circle-iosys", name: "IOSYS", participationType: "host" },
			],
			trackCount: 12,
		},
		{
			id: "rel-2",
			name: "Scarlet Destiny III",
			releaseDate: "2024-12-29",
			releaseType: "album",
			circles: [
				{
					id: "circle-alst",
					name: "Alstroemeria Records",
					participationType: "host",
				},
			],
			trackCount: 10,
		},
		{
			id: "rel-3",
			name: "東方紅魔狂 2024",
			releaseDate: "2024-12-30",
			releaseType: "album",
			circles: [
				{ id: "circle-cool", name: "COOL&CREATE", participationType: "host" },
			],
			trackCount: 8,
		},
		{
			id: "rel-4",
			name: "幻想郷の音楽",
			releaseDate: "2024-12-28",
			releaseType: "album",
			circles: [
				{ id: "circle-sf", name: "Silver Forest", participationType: "host" },
				{ id: "circle-guest", name: "凋叶棕", participationType: "guest" },
			],
			trackCount: 14,
		},
		{
			id: "rel-5",
			name: "Toho Eurobeat Vol.30",
			releaseDate: "2024-12-30",
			releaseType: "album",
			circles: [
				{ id: "circle-aone", name: "A-One", participationType: "host" },
			],
			trackCount: 15,
		},
	],
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

function EventDetailPage() {
	const { id } = Route.useParams();
	const [activeTab, setActiveTab] = useState<TabType>("releases");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");

	// モックデータから取得
	const event = mockEvents[id];
	const series = event ? mockEventSeries[event.eventSeriesId] : null;
	const days = mockEventDays[id] || [];
	const releases = mockReleases[id] || [];

	// 統計計算
	const circleIds = new Set(
		releases.flatMap((r) => r.circles.map((c) => c.id)),
	);
	const stats = {
		releaseCount: releases.length,
		circleCount: circleIds.size,
		trackCount: releases.reduce((sum, r) => sum + r.trackCount, 0),
	};

	// イベントが見つからない場合
	if (!event || !series) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "イベント", href: "/events" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">イベントが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのイベントは存在しません
					</p>
					<Link to="/events" className="btn btn-primary mt-4">
						イベント一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	// 日程表示
	const formatDateRange = () => {
		if (!event.startDate) return null;
		if (event.startDate === event.endDate || !event.endDate) {
			return event.startDate;
		}
		return `${event.startDate} 〜 ${event.endDate}`;
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "イベント", href: "/events" }, { label: event.name }]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="space-y-3">
					<div>
						<p className="text-base-content/60 text-sm">{series.name}</p>
						<h1 className="font-bold text-2xl sm:text-3xl">{event.name}</h1>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-base-content/70">
						{formatDateRange() && (
							<span className="flex items-center gap-1">
								<Calendar className="size-4" />
								{formatDateRange()}
							</span>
						)}
						{event.venue && (
							<span className="flex items-center gap-1">
								<MapPin className="size-4" />
								{event.venue}
							</span>
						)}
						{event.totalDays && (
							<span className="badge badge-outline">{event.totalDays}日間</span>
						)}
					</div>

					{/* イベント日 */}
					{days.length > 0 && (
						<div className="flex flex-wrap gap-2 pt-2">
							{days.map((day) => (
								<span key={day.id} className="badge badge-ghost">
									{day.dayNumber}日目: {day.date}
								</span>
							))}
						</div>
					)}
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-3 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">{stats.releaseCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Users className="size-5" />
							<span className="font-bold text-2xl">{stats.circleCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">サークル</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-accent">
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
				(viewMode === "grid" ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{releases.map((release) => (
							<div
								key={release.id}
								className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
							>
								<div className="card-body p-4">
									<h3 className="card-title text-base">{release.name}</h3>
									<div className="flex flex-wrap gap-1">
										{release.circles.map((circle) => (
											<Link
												key={circle.id}
												to="/circles/$id"
												params={{ id: circle.id }}
												className="badge badge-outline badge-sm hover:badge-primary"
											>
												{circle.name}
												{circle.participationType !== "host" && (
													<span className="ml-1 text-xs opacity-70">
														({participationTypeNames[circle.participationType]})
													</span>
												)}
											</Link>
										))}
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
									<th>サークル</th>
									<th className="hidden sm:table-cell">発売日</th>
									<th>曲数</th>
								</tr>
							</thead>
							<tbody>
								{releases.map((release) => (
									<tr key={release.id} className="hover:bg-base-200/50">
										<td className="font-medium">{release.name}</td>
										<td>
											{release.circles.map((circle, idx) => (
												<span key={circle.id}>
													{idx > 0 && ", "}
													<Link
														to="/circles/$id"
														params={{ id: circle.id }}
														className="hover:text-primary"
													>
														{circle.name}
													</Link>
												</span>
											))}
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

			{/* トラック一覧（簡易表示） */}
			{activeTab === "tracks" && (
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<Music className="mx-auto size-12 text-base-content/30" />
					<p className="mt-4 text-base-content/70">
						このイベントには{stats.trackCount}曲のトラックが登録されています
					</p>
					<p className="mt-2 text-base-content/50 text-sm">
						詳細なトラック一覧は各リリースページからご確認ください
					</p>
				</div>
			)}
		</div>
	);
}
