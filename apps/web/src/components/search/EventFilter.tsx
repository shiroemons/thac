import { Calendar, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EventOption, EventSeriesOption, SelectedEvent } from "./types";

interface EventFilterProps {
	/** 選択中のイベント */
	selectedEvent: SelectedEvent | null;
	/** イベント変更ハンドラ */
	onChange: (event: SelectedEvent | null) => void;
	/** イベントシリーズのリスト */
	eventSeries: EventSeriesOption[];
	/** イベントのリスト */
	events: EventOption[];
	/** カスタムクラス名 */
	className?: string;
}

/**
 * イベント選択フィルター
 *
 * - シリーズ選択 → イベント選択 の2段階
 * - シリーズでフィルタリングされたイベントを表示
 */
export function EventFilter({
	selectedEvent,
	onChange,
	eventSeries,
	events,
	className,
}: EventFilterProps) {
	const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");

	// 選択されたシリーズに属するイベント
	const filteredEvents = useMemo(() => {
		if (!selectedSeriesId) return [];
		return events.filter((e) => e.seriesId === selectedSeriesId);
	}, [events, selectedSeriesId]);

	const handleSeriesChange = (seriesId: string) => {
		setSelectedSeriesId(seriesId);
		if (!seriesId) {
			// シリーズ未選択の場合はクリア
			onChange(null);
			return;
		}
		// シリーズ選択時にデフォルトで「（すべて）」を選択状態にする
		const series = eventSeries.find((s) => s.id === seriesId);
		if (series) {
			// 別のシリーズを選択した場合、または初回選択の場合
			if (selectedEvent?.seriesId !== seriesId) {
				onChange({
					id: "",
					name: "（すべて）",
					seriesId: series.id,
					seriesName: series.name,
				});
			}
		}
	};

	const handleEventChange = (eventId: string) => {
		// シリーズが選択されていない場合は何もしない
		if (!selectedSeriesId) return;

		const series = eventSeries.find((s) => s.id === selectedSeriesId);
		if (!series) return;

		if (!eventId) {
			// 「（すべて）」を選択した場合、シリーズのみの選択状態にする
			onChange({
				id: "",
				name: "（すべて）",
				seriesId: series.id,
				seriesName: series.name,
			});
			return;
		}
		const event = events.find((e) => e.id === eventId);
		if (event) {
			onChange({
				id: event.id,
				name: event.name,
				seriesId: event.seriesId,
				seriesName: event.seriesName,
			});
		}
	};

	const handleClear = () => {
		setSelectedSeriesId("");
		onChange(null);
	};

	return (
		<div className={cn("space-y-3", className)}>
			{/* 選択中のイベント表示 */}
			{selectedEvent && (
				<div className="flex items-center gap-2">
					<div className="badge badge-info gap-1 pr-1">
						<Calendar className="h-3 w-3" />
						<span>
							{selectedEvent.seriesName}
							{selectedEvent.id ? `: ${selectedEvent.name}` : "（すべて）"}
						</span>
						<button
							type="button"
							onClick={handleClear}
							className="ml-1 rounded-full p-0.5 transition-colors hover:bg-base-content/20"
							aria-label="イベントをクリア"
						>
							<X className="h-3 w-3" />
						</button>
					</div>
				</div>
			)}

			{/* シリーズ・イベント選択 */}
			<div className="space-y-3">
				{/* シリーズ選択 */}
				<div className="flex items-center gap-2">
					<span className="w-20 shrink-0 text-sm">シリーズ</span>
					<select
						value={selectedSeriesId}
						onChange={(e) => handleSeriesChange(e.target.value)}
						className="select select-sm flex-1"
					>
						<option value="">選択してください</option>
						{eventSeries.map((series) => (
							<option key={series.id} value={series.id}>
								{series.name}
							</option>
						))}
					</select>
				</div>

				{/* イベント選択（シリーズ選択後に表示） */}
				{selectedSeriesId && (
					<div className="flex items-center gap-2">
						<span className="w-20 shrink-0 text-sm">イベント</span>
						<select
							value={selectedEvent?.id || ""}
							onChange={(e) => handleEventChange(e.target.value)}
							className="select select-sm flex-1"
						>
							<option value="">（すべて）</option>
							{filteredEvents.map((event) => (
								<option key={event.id} value={event.id}>
									{event.name}
									{event.date && ` (${event.date})`}
								</option>
							))}
						</select>
					</div>
				)}
			</div>
		</div>
	);
}
