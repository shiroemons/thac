import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
	isConflictError,
	RELEASE_TYPE_LABELS,
	type Release,
	type ReleaseType,
} from "@/lib/api-client";
import { releaseMutations } from "@/lib/mutation-options";
import {
	eventDaySelectOptionsQueryOptions,
	eventDaysQueryOptions,
	eventSelectOptionsQueryOptions,
} from "@/lib/query-options";
import { getErrorMessage } from "@/lib/utils";
import { ConflictDialog } from "./conflict-dialog";

// 作品タイプのオプション
const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_LABELS).map(
	([value, label]) => ({ value, label }),
);

// フォームデータの型定義
interface ReleaseFormData {
	name: string | undefined;
	nameJa: string | null | undefined;
	nameEn: string | null | undefined;
	releaseDate: string | null | undefined;
	releaseType: ReleaseType | null | undefined;
	eventId: string | null | undefined;
	eventDayId: string | null | undefined;
	notes: string | null | undefined;
}

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
	const queryClient = useQueryClient();
	const [editForm, setEditForm] = useState<Partial<Release>>({});
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Release>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<ReleaseFormData & Record<string, unknown>>();

	// 未保存変更保護フック
	const {
		showConfirmDialog,
		closeConfirmDialog,
		confirmDiscard,
		guardedOnOpenChange,
	} = useUnsavedChangesGuard(onOpenChange, {
		isDirty: formDirty.isDirty,
		isOpen: open,
	});

	// useMutation hook
	const updateMutation = useMutation(releaseMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isSubmitting = updateMutation.isPending;
	const mutationError = updateMutation.error;

	// ダイアログが開いたらフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open && release) {
			const initialFormData: ReleaseFormData = {
				name: release.name,
				nameJa: release.nameJa,
				nameEn: release.nameEn,
				releaseDate: release.releaseDate,
				releaseType: release.releaseType,
				eventId: release.eventId,
				eventDayId: release.eventDayId,
				notes: release.notes,
			};
			setEditForm(initialFormData);
			setSelectedEventId(release.eventId);
			setOriginalUpdatedAt(release.updatedAt);
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormData as ReleaseFormData & Record<string, unknown>,
			);
			updateMutation.reset();
			clearConflict();
		}
	}, [open, release, clearConflict]);

	// イベント選択オプション取得（selectで変換済み）
	const { data: eventOptions = [] } = useQuery({
		...eventSelectOptionsQueryOptions(),
		enabled: open,
	});

	// イベント日一覧取得（生データ：自動設定と日付取得に使用）
	const { data: eventDaysData } = useQuery({
		...eventDaysQueryOptions(selectedEventId),
		enabled: open && !!selectedEventId,
	});

	// イベント日選択オプション取得（selectで変換済み）
	const { data: eventDayOptions = [] } = useQuery({
		...eventDaySelectOptionsQueryOptions(selectedEventId),
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

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(editForm as ReleaseFormData & Record<string, unknown>);
	}, [editForm]);

	// 保存
	const handleSave = async (overrideUpdatedAt?: string) => {
		updateMutation.mutate(
			{
				id: release.id,
				data: {
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
				},
			},
			{
				onSuccess: () => {
					formDirty.reset();
					onOpenChange(false);
					onSuccess?.();
				},
				onError: (err) => {
					// 楽観的ロック競合エラーの場合
					if (isConflictError<Release>(err)) {
						setConflict(err.current);
					}
				},
			},
		);
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
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>作品の編集</DialogTitle>
					</DialogHeader>
					<DialogBody className="grid gap-4 py-4">
						{mutationError && !isConflictError(mutationError) ? (
							<div className="rounded-lg bg-error p-4 text-error-content text-sm">
								{getErrorMessage(mutationError)}
							</div>
						) : null}
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="release-name">
									作品名 <span className="text-error">*</span>
								</Label>
								<Input
									id="release-name"
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="例: 東方紅魔郷オリジナルサウンドトラック"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-nameJa">日本語名</Label>
								<Input
									id="release-nameJa"
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 東方紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-nameEn">英語名</Label>
								<Input
									id="release-nameEn"
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="例: Touhou Koumakyou"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-type">タイプ</Label>
								<Select
									id="release-type"
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
								<Label htmlFor="release-date">頒布日</Label>
								<Input
									id="release-date"
									type="date"
									value={editForm.releaseDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, releaseDate: e.target.value })
									}
									disabled={!!editForm.eventDayId}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="release-notes">メモ</Label>
								<Textarea
									id="release-notes"
									value={editForm.notes || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, notes: e.target.value })
									}
									placeholder="例: 来歴、特記事項など"
								/>
							</div>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => guardedOnOpenChange(false)}
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

			{/* 未保存変更確認ダイアログ */}
			<ConfirmDialog
				open={showConfirmDialog}
				onOpenChange={(open) => !open && closeConfirmDialog()}
				title="変更を破棄しますか？"
				description="保存されていない変更があります。このまま閉じると変更は失われます。"
				confirmLabel="破棄"
				cancelLabel="編集を続ける"
				variant="warning"
				onConfirm={confirmDiscard}
			/>
		</>
	);
}
