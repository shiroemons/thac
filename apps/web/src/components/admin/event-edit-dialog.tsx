import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	type Event,
	type EventWithDays,
	eventSeriesApi,
	eventsApi,
	isConflictError,
} from "@/lib/api-client";
import { suggestFromEventName } from "@/lib/event-name-parser";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SearchableSelect } from "../ui/searchable-select";
import { ConflictDialog } from "./conflict-dialog";

export interface EventFormData {
	name: string;
	eventSeriesId: string | null;
	edition: number | null;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
}

export interface EventEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	event?: Event | EventWithDays | null;
	onSuccess?: () => void;
}

export function EventEditDialog({
	open,
	onOpenChange,
	mode,
	event,
	onSuccess,
}: EventEditDialogProps) {
	const queryClient = useQueryClient();

	const [form, setForm] = useState<EventFormData>({
		name: "",
		eventSeriesId: null,
		edition: null,
		venue: null,
		startDate: null,
		endDate: null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Event>();

	// シリーズ新規作成用
	const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState("");

	// シリーズ一覧取得
	const { data: seriesData } = useQuery({
		queryKey: ["event-series"],
		queryFn: () => eventSeriesApi.list(),
		staleTime: 60_000,
	});
	const seriesList = seriesData?.data ?? [];

	const seriesOptions = useMemo(
		() => seriesList.map((s) => ({ value: s.id, label: s.name })),
		[seriesList],
	);

	// シリーズリストをユーティリティ関数で使えるようにラップ
	const suggest = useCallback(
		(eventName: string) => suggestFromEventName(eventName, seriesList),
		[seriesList],
	);

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && event) {
				setForm({
					name: event.name,
					eventSeriesId: event.eventSeriesId,
					edition: event.edition,
					venue: event.venue,
					startDate: event.startDate,
					endDate: event.endDate,
				});
				setOriginalUpdatedAt(event.updatedAt);
			} else {
				setForm({
					name: "",
					eventSeriesId: null,
					edition: null,
					venue: null,
					startDate: null,
					endDate: null,
				});
				setOriginalUpdatedAt(null);
			}
			setError(null);
			clearConflict();
		}
	}, [open, mode, event, clearConflict]);

	const handleNameChange = (name: string) => {
		const suggestion = suggest(name);
		if (mode === "create" && suggestion) {
			setForm({
				...form,
				name,
				eventSeriesId: suggestion.seriesId || form.eventSeriesId,
				edition: suggestion.edition || form.edition,
			});
		} else {
			setForm({ ...form, name });
		}
	};

	const handleCreateSeries = async () => {
		if (!newSeriesName.trim()) return;
		setIsSubmitting(true);
		setError(null);
		try {
			const id = createId.eventSeries();
			const newSeries = await eventSeriesApi.create({
				id,
				name: newSeriesName.trim(),
				sortOrder: seriesList.length + 1,
			});
			queryClient.invalidateQueries({ queryKey: ["event-series"] });
			setForm({ ...form, eventSeriesId: newSeries.id });
			setIsSeriesDialogOpen(false);
			setNewSeriesName("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "シリーズの作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async (overrideUpdatedAt?: string) => {
		if (!form.name.trim()) {
			setError("イベント名を入力してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				const id = createId.event();
				await eventsApi.create({
					id,
					eventSeriesId: form.eventSeriesId || "",
					name: form.name,
					edition: form.edition,
					totalDays: null,
					venue: form.venue,
					startDate: form.startDate,
					endDate: form.endDate,
				});
			} else if (event) {
				await eventsApi.update(event.id, {
					eventSeriesId: form.eventSeriesId,
					name: form.name,
					edition: form.edition,
					venue: form.venue,
					startDate: form.startDate,
					endDate: form.endDate,
					// 楽観的ロック: updatedAtを送信
					updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<Event>(e)) {
				setConflict(e.current);
				return;
			}
			setError(
				e instanceof Error
					? e.message
					: mode === "create"
						? "作成に失敗しました"
						: "更新に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: Event) => {
		setForm({
			name: data.name,
			eventSeriesId: data.eventSeriesId,
			edition: data.edition,
			venue: data.venue,
			startDate: data.startDate,
			endDate: data.endDate,
		});
		setOriginalUpdatedAt(data.updatedAt);
		clearConflict();
	};

	// 競合ダイアログで「上書き」を選択した場合
	const handleOverwrite = () => {
		if (conflictState.conflictData) {
			// 最新のupdatedAtで再送信
			handleSubmit(conflictState.conflictData.updatedAt);
			clearConflict();
		}
	};

	const title = mode === "create" ? "新規イベント" : "イベントの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{error && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{error}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="event-name">
								イベント名 <span className="text-error">*</span>
							</Label>
							<Input
								id="event-name"
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: 博麗神社例大祭21"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="event-series">シリーズ</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-primary text-xs hover:underline"
									onClick={() => setIsSeriesDialogOpen(true)}
									disabled={isSubmitting}
								>
									+ 新規シリーズ作成
								</Button>
							</div>
							<SearchableSelect
								id="event-series"
								value={form.eventSeriesId || ""}
								onChange={(val) =>
									setForm({ ...form, eventSeriesId: val || null })
								}
								options={seriesOptions}
								placeholder="シリーズを選択..."
								searchPlaceholder="シリーズを検索..."
								emptyMessage="シリーズが見つかりません"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="event-edition">回次</Label>
								<Input
									id="event-edition"
									type="number"
									value={form.edition ?? ""}
									onChange={(e) =>
										setForm({
											...form,
											edition: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 21"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="event-venue">会場</Label>
								<Input
									id="event-venue"
									value={form.venue || ""}
									onChange={(e) =>
										setForm({ ...form, venue: e.target.value || null })
									}
									placeholder="例: 東京ビッグサイト"
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="event-startDate">開始日</Label>
								<Input
									id="event-startDate"
									type="date"
									value={form.startDate || ""}
									onChange={(e) =>
										setForm({ ...form, startDate: e.target.value || null })
									}
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="event-endDate">終了日</Label>
								<Input
									id="event-endDate"
									type="date"
									value={form.endDate || ""}
									onChange={(e) =>
										setForm({ ...form, endDate: e.target.value || null })
									}
									disabled={isSubmitting}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => handleSubmit()}
							disabled={isSubmitting || !form.name.trim()}
						>
							{isSubmitting
								? mode === "create"
									? "作成中..."
									: "保存中..."
								: mode === "create"
									? "作成"
									: "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* シリーズ新規作成ダイアログ */}
			<Dialog open={isSeriesDialogOpen} onOpenChange={setIsSeriesDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ作成</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="new-series-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="new-series-name"
								value={newSeriesName}
								onChange={(e) => setNewSeriesName(e.target.value)}
								placeholder="例: 博麗神社例大祭"
								disabled={isSubmitting}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsSeriesDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreateSeries}
							disabled={isSubmitting || !newSeriesName.trim()}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 楽観的ロック競合ダイアログ */}
			<ConflictDialog
				open={conflictState.isConflict}
				onOpenChange={(open) => !open && clearConflict()}
				currentData={conflictState.conflictData}
				getDisplayName={(data) => data.name}
				onOverwrite={handleOverwrite}
				onContinueEditing={handleContinueEditing}
				isLoading={isSubmitting}
			/>
		</>
	);
}
