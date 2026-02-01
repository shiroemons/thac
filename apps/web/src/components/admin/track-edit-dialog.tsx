import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { GenreMultiSelect } from "@/components/ui/genre-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TagInput, type TagItem } from "@/components/ui/tag-input";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
	discsApi,
	eventDaysApi,
	eventsApi,
	genresApi,
	isConflictError,
	releasesApi,
	type Track,
	type TrackGenreInfo,
	trackTagsApi,
} from "@/lib/api-client";
import { trackMutations } from "@/lib/mutation-options";
import { ConflictDialog } from "./conflict-dialog";

interface TrackWithGenres extends Track {
	genres?: TrackGenreInfo[];
}

interface TrackEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track: TrackWithGenres;
	onSuccess?: () => void;
}

export function TrackEditDialog({
	open,
	onOpenChange,
	track,
	onSuccess,
}: TrackEditDialogProps) {
	const queryClient = useQueryClient();
	const [editForm, setEditForm] = useState<Partial<Track>>({});
	const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(
		null,
	);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	// ジャンル選択状態
	const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
	const [initialGenres, setInitialGenres] = useState<string[]>([]);
	// タグ選択状態（編集されたらセット、nullなら初期値を使用）
	const [editedTags, setEditedTags] = useState<TagItem[] | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Track>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<Partial<Track> & Record<string, unknown>>();

	// トラックのタグ取得
	const { data: trackTagsData } = useQuery({
		queryKey: ["tracks", track?.id, "tags"],
		queryFn: () => trackTagsApi.list(track.id),
		staleTime: 60_000,
		enabled: open && !!track?.id,
	});

	// APIデータを派生状態として変換（初期値）
	const initialTags = useMemo<TagItem[]>(() => {
		if (!trackTagsData) return [];
		return trackTagsData.map((t) => ({
			tagId: t.tagId,
			name: t.name,
			isLocked: t.isLocked,
		}));
	}, [trackTagsData]);

	// 表示用：編集中ならeditedTags、そうでなければinitialTags
	const selectedTags = editedTags ?? initialTags;

	// タグ変更ハンドラ
	const handleTagsChange = (tags: TagItem[]) => {
		setEditedTags(tags);
	};

	// ジャンル変更があるかどうか（早期に計算）
	const genresChanged = useMemo(() => {
		if (selectedGenres.length !== initialGenres.length) return true;
		return selectedGenres.some((code, i) => code !== initialGenres[i]);
	}, [selectedGenres, initialGenres]);

	// タグ変更があるかどうか
	const tagsChanged = useMemo(() => {
		// editedTagsがnullなら変更なし
		if (editedTags === null) return false;
		if (editedTags.length !== initialTags.length) return true;
		return editedTags.some((tag, i) => tag.tagId !== initialTags[i]?.tagId);
	}, [editedTags, initialTags]);

	// 未保存変更保護フック
	const {
		showConfirmDialog,
		closeConfirmDialog,
		confirmDiscard,
		guardedOnOpenChange,
	} = useUnsavedChangesGuard(onOpenChange, {
		isDirty: formDirty.isDirty || genresChanged || tagsChanged,
		isOpen: open,
	});

	// useMutation hook
	const updateMutation = useMutation(trackMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = updateMutation.isPending;
	const mutationError = updateMutation.error;

	// ダイアログが開いたらフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open && track) {
			const initialFormData: Partial<Track> = {
				name: track.name,
				nameJa: track.nameJa,
				nameEn: track.nameEn,
				trackNumber: track.trackNumber,
				releaseId: track.releaseId,
				discId: track.discId,
				releaseDate: track.releaseDate,
				eventId: track.eventId,
				eventDayId: track.eventDayId,
			};
			setEditForm(initialFormData);
			setSelectedReleaseId(track.releaseId);
			setSelectedEventId(track.eventId);
			setOriginalUpdatedAt(track.updatedAt);
			// ジャンル初期化
			const genreCodes = track.genres?.map((g) => g.code) ?? [];
			setSelectedGenres(genreCodes);
			setInitialGenres(genreCodes);
			// タグ編集状態をリセット（APIデータを初期値として使用）
			setEditedTags(null);
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormData as Partial<Track> & Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			updateMutation.reset();
			clearConflict();
		}
	}, [open, track, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(editForm as Partial<Track> & Record<string, unknown>);
	}, [editForm]);

	// 作品一覧取得
	const { data: releasesData } = useQuery({
		queryKey: ["releases", { limit: 200 }],
		queryFn: () => releasesApi.list({ limit: 200 }),
		staleTime: 60_000,
		enabled: open,
	});

	// ジャンル一覧取得
	const { data: genreOptionsData } = useQuery({
		queryKey: ["genres", { limit: 100 }],
		queryFn: () => genresApi.list({ limit: 100 }),
		staleTime: 300_000,
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

	// ジャンルオプション（GenreMultiSelect用）
	const genreOptions = useMemo(() => {
		return (genreOptionsData?.data ?? []).map((g) => ({
			code: g.code,
			nameJa: g.nameJa,
			nameEn: g.nameEn,
			color: g.color,
			icon: g.icon,
		}));
	}, [genreOptionsData?.data]);

	// 保存
	const handleSave = async (overrideUpdatedAt?: string) => {
		if (!track.releaseId) {
			return;
		}

		updateMutation.mutate(
			{
				releaseId: track.releaseId,
				trackId: track.id,
				data: {
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
				},
			},
			{
				onSuccess: async () => {
					// ジャンル変更がある場合は更新
					if (genresChanged) {
						try {
							await genresApi.updateTrackGenres(track.id, selectedGenres);
						} catch (error) {
							console.error("Failed to update genres:", error);
						}
					}
					// タグ変更がある場合は更新
					if (tagsChanged) {
						try {
							const tagsToUpdate = selectedTags.map((tag, index) => ({
								tagId: tag.tagId,
								position: index,
								isLocked: tag.isLocked,
							}));
							await trackTagsApi.update(track.id, tagsToUpdate);
						} catch (error) {
							console.error("Failed to update tags:", error);
						}
					}
					// キャッシュの無効化
					if (genresChanged || tagsChanged) {
						await queryClient.invalidateQueries({
							queryKey: ["tracks", track.id],
						});
						await queryClient.invalidateQueries({
							queryKey: ["releases", track.releaseId, "tracks"],
						});
						if (tagsChanged) {
							await queryClient.invalidateQueries({
								queryKey: ["tracks", track.id, "tags"],
							});
						}
					}
					formDirty.reset();
					setEditedTags(null); // タグ編集状態をリセット
					onOpenChange(false);
					onSuccess?.();
				},
				onError: (err) => {
					// 楽観的ロック競合エラーの場合
					if (isConflictError<Track>(err)) {
						setConflict(err.current);
					}
				},
			},
		);
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

	// ダイアログを閉じる際のハンドラ（タグ編集状態をリセット）
	const handleGuardedOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setEditedTags(null);
		}
		guardedOnOpenChange(isOpen);
	};

	// 破棄確認後のハンドラ
	const handleConfirmDiscard = () => {
		setEditedTags(null);
		confirmDiscard();
	};

	const isReleaseDateEditable = !selectedReleaseId || !editForm.eventDayId;
	const isDiscFieldVisible = !!selectedReleaseId;
	const isDiscSelectDisabled = !discsData || discsData.length <= 1;

	// エラーメッセージの取得（競合エラー以外）
	const displayError =
		mutationError && !isConflictError(mutationError)
			? mutationError instanceof Error
				? mutationError.message
				: "更新に失敗しました"
			: null;

	return (
		<>
			<Dialog open={open} onOpenChange={handleGuardedOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>トラックの編集</DialogTitle>
					</DialogHeader>
					<DialogBody className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-lg bg-error p-4 text-error-content text-sm">
								{displayError}
							</div>
						)}

						{/* 作品（読み取り専用） */}
						<div className="grid gap-2">
							<Label>作品</Label>
							<p className="text-base-content/70">
								{releasesData?.data.find((r) => r.id === track.releaseId)
									?.name || "未選択"}
							</p>
							<p className="text-base-content/50 text-sm">
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
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
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
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
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
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
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
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
						</div>

						{/* ジャンル */}
						<div className="grid gap-2">
							<Label htmlFor="track-genres">ジャンル（最大5件）</Label>
							<GenreMultiSelect
								id="track-genres"
								value={selectedGenres}
								onChange={setSelectedGenres}
								options={genreOptions}
								maxItems={5}
								placeholder="ジャンルを選択..."
							/>
						</div>

						{/* タグ */}
						<div className="grid gap-2">
							<Label htmlFor="track-tags">タグ（最大15件）</Label>
							<TagInput
								id="track-tags"
								value={selectedTags}
								onChange={handleTagsChange}
								maxTags={15}
								placeholder="タグを入力または選択..."
							/>
							<p className="text-base-content/50 text-sm">
								タグを入力してEnterで追加、既存タグからも選択可能です
							</p>
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
									<p className="text-base-content/50 text-sm">
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

						{/* 頒布日 */}
						<div className="grid gap-2">
							<Label htmlFor="releaseDate">頒布日</Label>
							<Input
								id="releaseDate"
								type="date"
								value={editForm.releaseDate || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, releaseDate: e.target.value })
								}
								disabled={!isReleaseDateEditable}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
							{!isReleaseDateEditable && (
								<p className="text-base-content/50 text-sm">
									※イベント日が設定されている場合、頒布日は自動設定されます
								</p>
							)}
						</div>
					</DialogBody>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => handleGuardedOpenChange(false)}
							disabled={isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => handleSave()}
							disabled={isPending || !editForm.name}
						>
							{isPending ? "保存中..." : "保存"}
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
				isLoading={isPending}
			/>

			{/* 未保存変更確認ダイアログ */}
			<ConfirmDialog
				open={showConfirmDialog}
				onOpenChange={(open) => !open && closeConfirmDialog()}
				title="変更を破棄しますか？"
				description="保存されていない変更があります。このまま閉じると変更は失われます。"
				confirmLabel="破棄"
				cancelLabel="編集を続ける"
				variant="warning"
				onConfirm={handleConfirmDiscard}
			/>
		</>
	);
}
