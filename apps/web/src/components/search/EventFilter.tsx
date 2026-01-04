import { Calendar, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { MockEvent, MockEventSeries } from "./mock-data";
import type { SelectedEvent } from "./types";

interface EventFilterProps {
	/** 選択中のイベント */
	selectedEvent: SelectedEvent | null;
	/** イベント変更ハンドラ */
	onChange: (event: SelectedEvent | null) => void;
	/** イベントシリーズのリスト */
	eventSeries: MockEventSeries[];
	/** イベントのリスト */
	events: MockEvent[];
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
		// シリーズ変更時は選択をクリア
		if (selectedEvent?.seriesName) {
			const series = eventSeries.find((s) => s.id === seriesId);
			if (series?.name !== selectedEvent.seriesName) {
				onChange(null);
			}
		}
	};

	const handleEventChange = (eventId: string) => {
		if (!eventId) {
			onChange(null);
			return;
		}
		const event = events.find((e) => e.id === eventId);
		if (event) {
			onChange({
				id: event.id,
				name: event.name,
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
							{selectedEvent.seriesName}: {selectedEvent.name}
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
						className="select select-sm select-bordered flex-1"
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
							className="select select-sm select-bordered flex-1"
						>
							<option value="">選択してください</option>
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
