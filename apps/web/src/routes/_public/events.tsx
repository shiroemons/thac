import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronDown, ChevronRight, Disc } from "lucide-react";
import { useState } from "react";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/events")({
	component: EventsPage,
});

type EventsViewMode = "series" | "year";

const STORAGE_KEY_VIEW = "events-view-mode";
const STORAGE_KEY_YEAR = "events-selected-year";
const STORAGE_KEY_EXPANDED = "events-expanded-series";

function getInitialViewMode(): EventsViewMode {
	if (typeof window === "undefined") return "series";
	return (localStorage.getItem(STORAGE_KEY_VIEW) as EventsViewMode) || "series";
}

function getInitialYear(): number {
	if (typeof window === "undefined") return 2024;
	const saved = localStorage.getItem(STORAGE_KEY_YEAR);
	return saved ? Number(saved) : 2024;
}

function getInitialExpandedSeries(): Set<string> {
	if (typeof window === "undefined") return new Set(["comiket"]);
	const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
	if (saved) {
		try {
			return new Set(JSON.parse(saved) as string[]);
		} catch {
			return new Set(["comiket"]);
		}
	}
	return new Set(["comiket"]);
}

interface Event {
	id: string;
	name: string;
	seriesId: string;
	seriesName: string;
	dateStart: string;
	dateEnd?: string;
	releaseCount: number;
}

interface EventSeries {
	id: string;
	name: string;
	eventCount: number;
}

// モックデータ - イベントシリーズ
const mockEventSeries: EventSeries[] = [
	{ id: "comiket", name: "コミックマーケット", eventCount: 12 },
	{ id: "reitaisai", name: "博麗神社例大祭", eventCount: 21 },
	{ id: "kouroumu", name: "紅楼夢", eventCount: 20 },
	{ id: "m3", name: "M3", eventCount: 24 },
];

// モックデータ - イベント
const mockEvents: Event[] = [
	// コミックマーケット
	{
		id: "c105",
		name: "C105",
		seriesId: "comiket",
		seriesName: "コミックマーケット",
		dateStart: "2024-12-28",
		dateEnd: "2024-12-30",
		releaseCount: 234,
	},
	{
		id: "c104",
		name: "C104",
		seriesId: "comiket",
		seriesName: "コミックマーケット",
		dateStart: "2024-08-11",
		dateEnd: "2024-08-12",
		releaseCount: 198,
	},
	{
		id: "c103",
		name: "C103",
		seriesId: "comiket",
		seriesName: "コミックマーケット",
		dateStart: "2023-12-30",
		dateEnd: "2023-12-31",
		releaseCount: 187,
	},
	{
		id: "c102",
		name: "C102",
		seriesId: "comiket",
		seriesName: "コミックマーケット",
		dateStart: "2023-08-12",
		dateEnd: "2023-08-13",
		releaseCount: 176,
	},
	// 博麗神社例大祭
	{
		id: "reitaisai21",
		name: "博麗神社例大祭21",
		seriesId: "reitaisai",
		seriesName: "博麗神社例大祭",
		dateStart: "2024-05-19",
		releaseCount: 312,
	},
	{
		id: "reitaisai20",
		name: "博麗神社例大祭20",
		seriesId: "reitaisai",
		seriesName: "博麗神社例大祭",
		dateStart: "2023-05-07",
		releaseCount: 289,
	},
	{
		id: "reitaisai19",
		name: "博麗神社例大祭19",
		seriesId: "reitaisai",
		seriesName: "博麗神社例大祭",
		dateStart: "2022-05-08",
		releaseCount: 245,
	},
	// 紅楼夢
	{
		id: "kouroumu20",
		name: "紅楼夢20",
		seriesId: "kouroumu",
		seriesName: "紅楼夢",
		dateStart: "2024-10-13",
		releaseCount: 156,
	},
	{
		id: "kouroumu19",
		name: "紅楼夢19",
		seriesId: "kouroumu",
		seriesName: "紅楼夢",
		dateStart: "2023-10-08",
		releaseCount: 143,
	},
	{
		id: "kouroumu18",
		name: "紅楼夢18",
		seriesId: "kouroumu",
		seriesName: "紅楼夢",
		dateStart: "2022-10-09",
		releaseCount: 134,
	},
	// M3
	{
		id: "m3-2024-autumn",
		name: "M3-2024秋",
		seriesId: "m3",
		seriesName: "M3",
		dateStart: "2024-10-27",
		releaseCount: 89,
	},
	{
		id: "m3-2024-spring",
		name: "M3-2024春",
		seriesId: "m3",
		seriesName: "M3",
		dateStart: "2024-04-28",
		releaseCount: 76,
	},
	{
		id: "m3-2023-autumn",
		name: "M3-2023秋",
		seriesId: "m3",
		seriesName: "M3",
		dateStart: "2023-10-29",
		releaseCount: 82,
	},
	{
		id: "m3-2023-spring",
		name: "M3-2023春",
		seriesId: "m3",
		seriesName: "M3",
		dateStart: "2023-04-30",
		releaseCount: 71,
	},
];

function formatDateRange(start: string, end?: string): string {
	const startDate = new Date(start);
	const formatDate = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	if (!end) {
		return formatDate(startDate);
	}

	const endDate = new Date(end);
	return `${formatDate(startDate)}〜${formatDate(endDate).split("-").slice(1).join("-")}`;
}

function getYear(dateStr: string): number {
	return new Date(dateStr).getFullYear();
}

function EventsPage() {
	const [viewMode, setViewModeState] =
		useState<EventsViewMode>(getInitialViewMode);
	const [selectedYear, setSelectedYearState] = useState<number>(getInitialYear);
	const [expandedSeries, setExpandedSeriesState] = useState<Set<string>>(
		getInitialExpandedSeries,
	);

	const setViewMode = (view: EventsViewMode) => {
		setViewModeState(view);
		localStorage.setItem(STORAGE_KEY_VIEW, view);
	};

	const setSelectedYear = (year: number) => {
		setSelectedYearState(year);
		localStorage.setItem(STORAGE_KEY_YEAR, String(year));
	};

	const toggleSeries = (seriesId: string) => {
		setExpandedSeriesState((prev) => {
			const next = new Set(prev);
			if (next.has(seriesId)) {
				next.delete(seriesId);
			} else {
				next.add(seriesId);
			}
			localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...next]));
			return next;
		});
	};

	// 年リスト（イベントから抽出）
	const years = [...new Set(mockEvents.map((e) => getYear(e.dateStart)))].sort(
		(a, b) => b - a,
	);

	// シリーズごとにイベントをグループ化
	const eventsBySeries = mockEventSeries.map((series) => ({
		...series,
		events: mockEvents
			.filter((e) => e.seriesId === series.id)
			.sort(
				(a, b) =>
					new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime(),
			),
	}));

	// 年ごとにイベントをグループ化
	const eventsByYear = years.map((year) => ({
		year,
		events: mockEvents
			.filter((e) => getYear(e.dateStart) === year)
			.sort(
				(a, b) =>
					new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime(),
			),
	}));

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "イベント" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">イベント一覧</h1>
					<p className="mt-1 text-base-content/70">
						同人即売会 · {mockEvents.length}件
					</p>
				</div>

				{/* 表示モード切替 */}
				<div className="flex gap-1 rounded-lg bg-base-200 p-1">
					<button
						type="button"
						className={`btn btn-sm ${viewMode === "series" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setViewMode("series")}
						aria-pressed={viewMode === "series"}
					>
						シリーズ別
					</button>
					<button
						type="button"
						className={`btn btn-sm ${viewMode === "year" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setViewMode("year")}
						aria-pressed={viewMode === "year"}
					>
						年別
					</button>
				</div>
			</div>

			{/* シリーズ別表示 */}
			{viewMode === "series" && (
				<div className="space-y-2">
					{eventsBySeries.map((series) => (
						<div
							key={series.id}
							className="overflow-hidden rounded-lg border border-base-300 bg-base-100"
						>
							{/* シリーズヘッダー */}
							<button
								type="button"
								className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-base-200/50"
								onClick={() => toggleSeries(series.id)}
								aria-expanded={expandedSeries.has(series.id)}
							>
								<div className="flex items-center gap-3">
									{expandedSeries.has(series.id) ? (
										<ChevronDown className="size-5" aria-hidden="true" />
									) : (
										<ChevronRight className="size-5" aria-hidden="true" />
									)}
									<span className="font-bold text-lg">{series.name}</span>
								</div>
								<span className="badge badge-ghost">{series.eventCount}回</span>
							</button>

							{/* イベントリスト */}
							{expandedSeries.has(series.id) && (
								<div className="border-base-300 border-t">
									{series.events.map((event) => (
										<Link
											key={event.id}
											to="/events/$id"
											params={{ id: event.id }}
											className="flex items-center justify-between border-base-200 border-b px-4 py-3 pl-12 last:border-b-0 hover:bg-base-200/30"
										>
											<div className="flex items-center gap-4">
												<span className="font-medium">{event.name}</span>
												<span className="flex items-center gap-1 text-base-content/50 text-sm">
													<Calendar className="size-4" aria-hidden="true" />
													{formatDateRange(event.dateStart, event.dateEnd)}
												</span>
											</div>
											<span className="flex items-center gap-1 text-base-content/70 text-sm">
												<Disc className="size-4" aria-hidden="true" />
												{event.releaseCount}リリース
											</span>
										</Link>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* 年別表示 */}
			{viewMode === "year" && (
				<div className="space-y-6">
					{/* 年選択タブ */}
					<div className="flex flex-wrap gap-2">
						{years.map((year) => (
							<button
								key={year}
								type="button"
								className={`btn btn-sm ${selectedYear === year ? "btn-primary" : "btn-ghost"}`}
								onClick={() => setSelectedYear(year)}
								aria-pressed={selectedYear === year}
							>
								{year}
							</button>
						))}
					</div>

					{/* 選択年のイベント一覧 */}
					{eventsByYear
						.filter((group) => group.year === selectedYear)
						.map((group) => (
							<div
								key={group.year}
								className="overflow-hidden rounded-lg border border-base-300 bg-base-100"
							>
								<div className="border-base-300 border-b bg-base-200/50 px-4 py-3">
									<h2 className="font-bold text-lg">{group.year}年</h2>
									<p className="text-base-content/70 text-sm">
										{group.events.length}イベント
									</p>
								</div>
								<div className="overflow-x-auto">
									<table className="table">
										<thead>
											<tr>
												<th>月</th>
												<th>イベント名</th>
												<th>開催日</th>
												<th>リリース数</th>
											</tr>
										</thead>
										<tbody>
											{group.events.map((event) => {
												const month = new Date(event.dateStart).getMonth() + 1;
												return (
													<tr key={event.id} className="hover:bg-base-200/50">
														<td className="text-base-content/70">{month}月</td>
														<td>
															<Link
																to="/events/$id"
																params={{ id: event.id }}
																className="font-medium hover:text-primary"
															>
																{event.name}
															</Link>
														</td>
														<td className="text-base-content/70">
															{formatDateRange(event.dateStart, event.dateEnd)}
														</td>
														<td className="text-base-content/70">
															<span className="flex items-center gap-1">
																<Disc className="size-4" aria-hidden="true" />
																{event.releaseCount}
															</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						))}
				</div>
			)}
		</div>
	);
}
