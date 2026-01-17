import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { useEffect, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { type EventSeries, isConflictError } from "@/lib/api-client";
import { eventSeriesMutations } from "@/lib/mutation-options";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ConflictDialog } from "./conflict-dialog";

export interface EventSeriesFormData {
	name: string;
	sortOrder: number;
}

export interface EventSeriesEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	eventSeries?: EventSeries | null;
	onSuccess?: () => void;
	/** 新規作成時のデフォルトsortOrder（未指定時は0） */
	defaultSortOrder?: number;
}

export function EventSeriesEditDialog({
	open,
	onOpenChange,
	mode,
	eventSeries,
	onSuccess,
	defaultSortOrder = 0,
}: EventSeriesEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<EventSeriesFormData>({
		name: "",
		sortOrder: 0,
	});
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	// 上書き用のupdatedAt（競合解決時に使用）
	const [overrideUpdatedAt, setOverrideUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<EventSeries>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<
		EventSeriesFormData & Record<string, unknown>
	>();

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

	// useMutation hooks
	const createMutation = useMutation(eventSeriesMutations.create(queryClient));
	const updateMutation = useMutation({
		...eventSeriesMutations.update(queryClient),
		onError: (error: Error) => {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<EventSeries>(error)) {
				setConflict(error.current);
			}
		},
	});

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: EventSeriesFormData;
			if (mode === "edit" && eventSeries) {
				initialFormState = {
					name: eventSeries.name,
					sortOrder: eventSeries.sortOrder ?? 0,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(eventSeries.updatedAt);
			} else {
				initialFormState = {
					name: "",
					sortOrder: defaultSortOrder,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(null);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as EventSeriesFormData & Record<string, unknown>,
			);
			setOverrideUpdatedAt(null);
			clearConflict();
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [open, mode, eventSeries, defaultSortOrder, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as EventSeriesFormData & Record<string, unknown>);
	}, [form]);

	const handleSubmit = (submitOverrideUpdatedAt?: string) => {
		if (!form.name.trim()) {
			return;
		}

		if (mode === "create") {
			const id = createId.eventSeries();
			createMutation.mutate(
				{
					id,
					name: form.name,
					sortOrder: form.sortOrder,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (eventSeries) {
			updateMutation.mutate(
				{
					id: eventSeries.id,
					data: {
						name: form.name,
						sortOrder: form.sortOrder,
						// 楽観的ロック: updatedAtを送信
						updatedAt:
							submitOverrideUpdatedAt ||
							overrideUpdatedAt ||
							originalUpdatedAt ||
							undefined,
					},
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		}
	};

	// エラーメッセージの取得（競合エラーは除外）
	const displayError =
		mutationError && !isConflictError(mutationError)
			? mutationError instanceof Error
				? mutationError.message
				: mode === "create"
					? "作成に失敗しました"
					: "更新に失敗しました"
			: null;

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: EventSeries) => {
		setForm({
			name: data.name,
			sortOrder: data.sortOrder ?? 0,
		});
		setOriginalUpdatedAt(data.updatedAt);
		setOverrideUpdatedAt(null);
		updateMutation.reset();
		clearConflict();
	};

	// 競合ダイアログで「上書き」を選択した場合
	const handleOverwrite = () => {
		if (conflictState.conflictData) {
			// 最新のupdatedAtで再送信
			setOverrideUpdatedAt(conflictState.conflictData.updatedAt);
			updateMutation.reset();
			clearConflict();
			handleSubmit(conflictState.conflictData.updatedAt);
		}
	};

	const title =
		mode === "create" ? "新規イベントシリーズ" : "イベントシリーズの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-md bg-error/10 p-4 text-error text-sm">
								{displayError}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-eventSeries-name`}>
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-eventSeries-name`}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: 博麗神社例大祭"
								disabled={isPending}
							/>
						</div>
						{mode === "edit" && (
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-eventSeries-sortOrder`}>表示順</Label>
								<Input
									id={`${mode}-eventSeries-sortOrder`}
									type="number"
									value={form.sortOrder}
									onChange={(e) =>
										setForm({
											...form,
											sortOrder: e.target.value
												? Number.parseInt(e.target.value, 10)
												: 0,
										})
									}
									disabled={isPending}
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => guardedOnOpenChange(false)}
							disabled={isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => handleSubmit()}
							disabled={isPending || !form.name.trim()}
						>
							{isPending
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
				onConfirm={confirmDiscard}
			/>
		</>
	);
}
