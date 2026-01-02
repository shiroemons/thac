import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	eventDaysApi,
	eventsApi,
	isConflictError,
	RELEASE_TYPE_LABELS,
	type Release,
	type ReleaseType,
	releasesApi,
} from "@/lib/api-client";
import { ConflictDialog } from "./conflict-dialog";

// 作品タイプのオプション
const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_LABELS).map(
	([value, label]) => ({ value, label }),
);

interface ReleaseEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	release: Release;
	onSuccess?: () => void;
}

export function ReleaseEditDialog({
	open,
	onOpenChange,
	release,
	onSuccess,
}: ReleaseEditDialogProps) {
	const [editForm, setEditForm] = useState<Partial<Release>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Release>();

	// ダイアログが開いたらフォームを初期化
	useEffect(() => {
		if (open && release) {
			setEditForm({
				name: release.name,
				nameJa: release.nameJa,
				nameEn: release.nameEn,
				releaseDate: release.releaseDate,
				releaseType: release.releaseType,
				eventId: release.eventId,
				eventDayId: release.eventDayId,
				notes: release.notes,
			});
			setSelectedEventId(release.eventId);
			setOriginalUpdatedAt(release.updatedAt);
			setMutationError(null);
			clearConflict();
		}
	}, [open, release, clearConflict]);

	// イベント一覧取得
	const { data: eventsData } = useQuery({
		queryKey: ["events"],
		queryFn: () => eventsApi.list({ limit: 500 }),
		staleTime: 300_000,
		enabled: open,
	});

	// イベント日一覧取得
	const { data: eventDaysData } = useQuery({
		queryKey: ["events", selectedEventId, "days"],
		queryFn: () =>
			selectedEventId
				? eventDaysApi.list(selectedEventId)
				: Promise.resolve([]),
		staleTime: 300_000,
		enabled: open && !!selectedEventId,
	});

	// イベント日が取得されたら1日目を自動設定
	// editForm.eventDayIdを依存配列に含めると無限ループが発生するため、意図的に省略
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally omitted to prevent infinite loop
	useEffect(() => {
		if (
			selectedEventId &&
			eventDaysData &&
			eventDaysData.length > 0 &&
			!editForm.eventDayId
		) {
			const firstDay =
				eventDaysData.find((d) => d.dayNumber === 1) || eventDaysData[0];
			if (firstDay) {
				setEditForm((prev) => ({
					...prev,
					eventDayId: firstDay.id,
					releaseDate: firstDay.date,
				}));
			}
		}
	}, [selectedEventId, eventDaysData]);

	// イベントオプション
	const eventOptions = useMemo(() => {
		const events = eventsData?.data ?? [];
		return events.map((e) => ({
			value: e.id,
			label: e.seriesName ? `【${e.seriesName}】${e.name}` : e.name,
		}));
	}, [eventsData?.data]);

	// イベント日オプション
	const eventDayOptions = useMemo(() => {
		const days = eventDaysData ?? [];
		const hasMultipleDays = days.length > 1;
		return days.map((d) => ({
			value: d.id,
			label: hasMultipleDays ? `${d.dayNumber}日目（${d.date}）` : d.date,
		}));
	}, [eventDaysData]);

	// 保存
	const handleSave = async (overrideUpdatedAt?: string) => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await releasesApi.update(release.id, {
				name: editForm.name,
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				releaseDate: editForm.releaseDate || null,
				releaseType: (editForm.releaseType as ReleaseType) || null,
				eventId: editForm.eventId || null,
				eventDayId: editForm.eventDayId || null,
				notes: editForm.notes || null,
				// 楽観的ロック: updatedAtを送信
				updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
			});
			onSuccess?.();
			onOpenChange(false);
		} catch (err) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<Release>(err)) {
				setConflict(err.current);
				return;
			}
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: Release) => {
		setEditForm({
			name: data.name,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			releaseDate: data.releaseDate,
			releaseType: data.releaseType,
			eventId: data.eventId,
			eventDayId: data.eventDayId,
			notes: data.notes,
		});
		setSelectedEventId(data.eventId);
		setOriginalUpdatedAt(data.updatedAt);
		clearConflict();
	};

	// 競合ダイアログで「上書き」を選択した場合
	const handleOverwrite = () => {
		if (conflictState.conflictData) {
			// 最新のupdatedAtで再送信
			handleSave(conflictState.conflictData.updatedAt);
			clearConflict();
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>リリースの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label>
									作品名 <span className="text-error">*</span>
								</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="例: 東方紅魔郷オリジナルサウンドトラック"
								/>
							</div>
							<div className="grid gap-2">
								<Label>日本語名</Label>
								<Input
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 東方紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label>英語名</Label>
								<Input
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="例: Touhou Koumakyou"
								/>
							</div>
							<div className="grid gap-2">
								<Label>タイプ</Label>
								<Select
									value={editForm.releaseType || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											releaseType: e.target.value as ReleaseType,
										})
									}
								>
									<option value="">選択してください</option>
									{RELEASE_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-event">イベント</Label>
								<SearchableSelect
									id="release-event"
									value={editForm.eventId || ""}
									onChange={(value) => {
										setEditForm({
											...editForm,
											eventId: value || null,
											eventDayId: null,
										});
										setSelectedEventId(value || null);
									}}
									options={eventOptions}
									placeholder="イベントを選択"
									searchPlaceholder="イベントを検索..."
									emptyMessage="イベントが見つかりません"
									clearable
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-event-day">イベント日</Label>
								<SearchableSelect
									id="release-event-day"
									value={editForm.eventDayId || ""}
									onChange={(value) => {
										const selectedDay = eventDaysData?.find(
											(d) => d.id === value,
										);
										setEditForm({
											...editForm,
											eventDayId: value || null,
											releaseDate: selectedDay?.date || editForm.releaseDate,
										});
									}}
									options={eventDayOptions}
									placeholder="イベント日を選択"
									searchPlaceholder="イベント日を検索..."
									emptyMessage={
										selectedEventId
											? "イベント日が見つかりません"
											: "先にイベントを選択してください"
									}
									disabled={
										!selectedEventId || (eventDaysData?.length ?? 0) <= 1
									}
									clearable
								/>
							</div>
							<div className="grid gap-2">
								<Label>発売日</Label>
								<Input
									type="date"
									value={editForm.releaseDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, releaseDate: e.target.value })
									}
									disabled={!!editForm.eventDayId}
								/>
							</div>
							<div className="grid gap-2">
								<Label>メモ</Label>
								<Textarea
									value={editForm.notes || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, notes: e.target.value })
									}
									placeholder="例: 来歴、特記事項など"
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
							onClick={() => handleSave()}
							disabled={isSubmitting || !editForm.name}
						>
							{isSubmitting ? "保存中..." : "保存"}
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
