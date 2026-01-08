import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronDown, ChevronRight, Disc } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, PublicBreadcrumb } from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import { type PublicEventItem, publicApi } from "@/lib/public-api";

type EventsViewMode = "series" | "year";

const STORAGE_KEY_VIEW = "events-view-mode";
const STORAGE_KEY_YEAR = "events-selected-year";
const STORAGE_KEY_EXPANDED = "events-expanded-series";

export const Route = createFileRoute("/_public/events")({
	head: () => createPageHead("イベント"),
	loader: async () => {
		try {
			// 全イベントを取得（十分大きなlimitで）
			const response = await publicApi.events.list({
				page: 1,
				limit: 1000,
				sortBy: "startDate",
				sortOrder: "desc",
			});
			return { events: response.data, total: response.total };
		} catch {
			return { events: [], total: 0 };
		}
	},
	component: EventsPage,
});

function formatDateRange(start: string | null, end: string | null): string {
	if (!start) return "-";

	if (!end || start === end) {
		return start;
	}

	// 同じ年月の場合は日だけ表示
	const endParts = end.split("-");
	return `${start}〜${endParts[2]}`;
}

function getYear(dateStr: string | null): number | null {
	if (!dateStr) return null;
	return Number.parseInt(dateStr.split("-")[0], 10);
}

function EventsPage() {
	const { events, total } = Route.useLoaderData();
	const [viewMode, setViewModeState] = useState<EventsViewMode>("series");
	const [selectedYear, setSelectedYearState] = useState<number | null>(null);
	const [expandedSeries, setExpandedSeriesState] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		const savedView = localStorage.getItem(STORAGE_KEY_VIEW) as EventsViewMode;
		if (savedView) setViewModeState(savedView);
		const savedYear = localStorage.getItem(STORAGE_KEY_YEAR);
		if (savedYear) setSelectedYearState(Number(savedYear));
		const savedExpanded = localStorage.getItem(STORAGE_KEY_EXPANDED);
		if (savedExpanded) {
			try {
				setExpandedSeriesState(new Set(JSON.parse(savedExpanded) as string[]));
			} catch {
				// Keep default
			}
		}
	}, []);

	// 初期選択年を設定
	useEffect(() => {
		if (selectedYear === null && events.length > 0) {
			const years = [
				...new Set(
					events.map((e) => getYear(e.startDate)).filter((y) => y !== null),
				),
			].sort((a, b) => (b ?? 0) - (a ?? 0));
			if (years.length > 0) {
				setSelectedYearState(years[0]);
			}
		}
	}, [events, selectedYear]);

	// 初期展開シリーズを設定
	useEffect(() => {
		if (expandedSeries.size === 0 && events.length > 0) {
			const firstSeriesId = events.find((e) => e.eventSeriesId)?.eventSeriesId;
			if (firstSeriesId) {
				setExpandedSeriesState(new Set([firstSeriesId]));
			}
		}
	}, [events, expandedSeries.size]);

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
	const years = [
		...new Set(
			events.map((e) => getYear(e.startDate)).filter((y) => y !== null),
		),
	].sort((a, b) => (b ?? 0) - (a ?? 0)) as number[];

	// シリーズごとにイベントをグループ化
	const seriesMap = new Map<
		string,
		{ id: string; name: string; events: PublicEventItem[] }
	>();
	for (const event of events) {
		const seriesId = event.eventSeriesId || "other";
		const seriesName = event.eventSeriesName || "その他";
		if (!seriesMap.has(seriesId)) {
			seriesMap.set(seriesId, { id: seriesId, name: seriesName, events: [] });
		}
		seriesMap.get(seriesId)?.events.push(event);
	}
	const eventsBySeries = [...seriesMap.values()].sort((a, b) =>
		a.name.localeCompare(b.name, "ja"),
	);

	// 年ごとにイベントをグループ化
	const eventsByYear = years.map((year) => ({
		year,
		events: events
			.filter((e) => getYear(e.startDate) === year)
			.sort((a, b) => {
				if (!a.startDate || !b.startDate) return 0;
				return b.startDate.localeCompare(a.startDate);
			}),
	}));

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "イベント" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">イベント一覧</h1>
					<p className="mt-1 text-base-content/70">
						同人即売会 · {formatNumber(total)}件
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
			{viewMode === "series" &&
				(eventsBySeries.length === 0 ? (
					<EmptyState type="empty" title="イベントがありません" />
				) : (
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
									<span className="badge badge-ghost">
										{series.events.length}回
									</span>
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
														{formatDateRange(event.startDate, event.endDate)}
													</span>
												</div>
												<span className="flex items-center gap-1 text-base-content/70 text-sm">
													<Disc className="size-4" aria-hidden="true" />
													{formatNumber(event.releaseCount)}リリース
												</span>
											</Link>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				))}

			{/* 年別表示 */}
			{viewMode === "year" &&
				(years.length === 0 ? (
					<EmptyState type="empty" title="イベントがありません" />
				) : (
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
													const month = event.startDate
														? Number.parseInt(event.startDate.split("-")[1], 10)
														: null;
													return (
														<tr key={event.id} className="hover:bg-base-200/50">
															<td className="text-base-content/70">
																{month ? `${month}月` : "-"}
															</td>
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
																{formatDateRange(
																	event.startDate,
																	event.endDate,
																)}
															</td>
															<td className="text-base-content/70">
																<span className="flex items-center gap-1">
																	<Disc className="size-4" aria-hidden="true" />
																	{formatNumber(event.releaseCount)}
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
				))}
		</div>
	);
}
