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
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	discsApi,
	eventDaysApi,
	eventsApi,
	isConflictError,
	releasesApi,
	type Track,
	tracksApi,
} from "@/lib/api-client";
import { ConflictDialog } from "./conflict-dialog";

interface TrackEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track: Track;
	onSuccess?: () => void;
}

export function TrackEditDialog({
	open,
	onOpenChange,
	track,
	onSuccess,
}: TrackEditDialogProps) {
	const [editForm, setEditForm] = useState<Partial<Track>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(
		null,
	);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Track>();

	// ダイアログが開いたらフォームを初期化
	useEffect(() => {
		if (open && track) {
			setEditForm({
				name: track.name,
				nameJa: track.nameJa,
				nameEn: track.nameEn,
				trackNumber: track.trackNumber,
				releaseId: track.releaseId,
				discId: track.discId,
				releaseDate: track.releaseDate,
				eventId: track.eventId,
				eventDayId: track.eventDayId,
			});
			setSelectedReleaseId(track.releaseId);
			setSelectedEventId(track.eventId);
			setOriginalUpdatedAt(track.updatedAt);
			setMutationError(null);
			clearConflict();
		}
	}, [open, track, clearConflict]);

	// 作品一覧取得
	const { data: releasesData } = useQuery({
		queryKey: ["releases", { limit: 200 }],
		queryFn: () => releasesApi.list({ limit: 200 }),
		staleTime: 60_000,
		enabled: open,
	});

	// ディスク一覧取得（作品が選択されている場合）
	const { data: discsData } = useQuery({
		queryKey: ["releases", selectedReleaseId, "discs"],
		queryFn: () =>
			selectedReleaseId
				? discsApi.list(selectedReleaseId)
				: Promise.resolve([]),
		staleTime: 60_000,
		enabled: open && !!selectedReleaseId,
	});

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

	// ディスクが1枚のみの場合、自動選択
	useEffect(() => {
		if (discsData && discsData.length === 1 && !editForm.discId) {
			setEditForm((prev) => ({
				...prev,
				discId: discsData[0]?.id || null,
			}));
		}
	}, [discsData, editForm.discId]);

	// イベント日が取得されたら1日目を自動設定（イベント日未選択の場合）
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
	}, [selectedEventId, eventDaysData, editForm.eventDayId]);

	// ディスクオプション
	const discOptions = useMemo(() => {
		const discs = discsData ?? [];
		return discs.map((d) => ({
			value: d.id,
			label: d.discName
				? `Disc ${d.discNumber}: ${d.discName}`
				: `Disc ${d.discNumber}`,
		}));
	}, [discsData]);

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
		if (!track.releaseId) {
			setMutationError("作品IDが不正です");
			return;
		}

		setIsSubmitting(true);
		setMutationError(null);
		try {
			await tracksApi.update(track.releaseId, track.id, {
				name: editForm.name ?? "",
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				trackNumber: editForm.trackNumber,
				discId: editForm.discId || null,
				releaseDate: editForm.releaseDate || null,
				eventId: editForm.eventId || null,
				eventDayId: editForm.eventDayId || null,
				// 楽観的ロック: updatedAtを送信
				updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
			});
			onSuccess?.();
			onOpenChange(false);
		} catch (err) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<Track>(err)) {
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
	const handleContinueEditing = (data: Track) => {
		setEditForm({
			name: data.name,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			trackNumber: data.trackNumber,
			releaseId: data.releaseId,
			discId: data.discId,
			releaseDate: data.releaseDate,
			eventId: data.eventId,
			eventDayId: data.eventDayId,
		});
		setSelectedReleaseId(data.releaseId);
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

	const isReleaseDateEditable = !selectedReleaseId || !editForm.eventDayId;
	const isDiscFieldVisible = !!selectedReleaseId;
	const isDiscSelectDisabled = !discsData || discsData.length <= 1;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>トラックの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}

						{/* 作品（読み取り専用） */}
						<div className="grid gap-2">
							<Label>作品</Label>
							<p className="text-base-content/70">
								{releasesData?.data.find((r) => r.id === track.releaseId)
									?.name || "未選択"}
							</p>
							<p className="text-base-content/50 text-xs">
								※作品の変更はサポートされていません。変更する場合は削除後に再作成してください。
							</p>
						</div>

						{/* ディスク選択 */}
						{isDiscFieldVisible && (
							<div className="grid gap-2">
								<Label htmlFor="track-disc">ディスク</Label>
								<SearchableSelect
									id="track-disc"
									value={editForm.discId || ""}
									onChange={(value) =>
										setEditForm({ ...editForm, discId: value || null })
									}
									options={discOptions}
									placeholder={
										isDiscSelectDisabled
											? discsData && discsData.length === 1
												? discOptions[0]?.label
												: "ディスクなし"
											: "ディスクを選択"
									}
									searchPlaceholder="ディスクを検索..."
									emptyMessage="ディスクが見つかりません"
									disabled={isDiscSelectDisabled}
									clearable={!isDiscSelectDisabled}
								/>
							</div>
						)}

						{/* トラック名 */}
						<div className="grid gap-2">
							<Label htmlFor="track-name">
								トラック名 <span className="text-error">*</span>
							</Label>
							<Input
								id="track-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: ネイティブフェイス"
							/>
						</div>

						{/* トラック番号 */}
						<div className="grid gap-2">
							<Label htmlFor="trackNumber">
								トラック番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="trackNumber"
								type="number"
								min="1"
								value={editForm.trackNumber || ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										trackNumber: Number.parseInt(e.target.value, 10) || 1,
									})
								}
							/>
						</div>

						{/* 日本語名 */}
						<div className="grid gap-2">
							<Label htmlFor="nameJa">日本語名</Label>
							<Input
								id="nameJa"
								value={editForm.nameJa || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, nameJa: e.target.value })
								}
								placeholder="例: ネイティブフェイス"
							/>
						</div>

						{/* 英語名 */}
						<div className="grid gap-2">
							<Label htmlFor="nameEn">英語名</Label>
							<Input
								id="nameEn"
								value={editForm.nameEn || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, nameEn: e.target.value })
								}
								placeholder="例: Native Face"
							/>
						</div>

						{/* イベント */}
						<div className="grid gap-2">
							<Label>イベント</Label>
							{selectedReleaseId ? (
								<>
									<p className="text-base-content/70">
										{editForm.eventId
											? eventsData?.data.find((e) => e.id === editForm.eventId)
													?.name || "未設定"
											: "未設定"}
									</p>
									<p className="text-base-content/50 text-xs">
										※作品に紐づくトラックのイベントは変更できません
									</p>
								</>
							) : (
								<SearchableSelect
									id="track-event"
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
							)}
						</div>

						{/* イベント日 */}
						<div className="grid gap-2">
							<Label>イベント日</Label>
							{selectedReleaseId ? (
								<p className="text-base-content/70">
									{editForm.eventDayId
										? eventDayOptions.find(
												(d) => d.value === editForm.eventDayId,
											)?.label || "未設定"
										: "未設定"}
								</p>
							) : (
								<SearchableSelect
									id="track-event-day"
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
							)}
						</div>

						{/* リリース日 */}
						<div className="grid gap-2">
							<Label htmlFor="releaseDate">リリース日</Label>
							<Input
								id="releaseDate"
								type="date"
								value={editForm.releaseDate || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, releaseDate: e.target.value })
								}
								disabled={!isReleaseDateEditable}
							/>
							{!isReleaseDateEditable && (
								<p className="text-base-content/50 text-xs">
									※イベント日が設定されている場合、リリース日は自動設定されます
								</p>
							)}
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
