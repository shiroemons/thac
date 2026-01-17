import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { useEffect, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
	type Artist,
	type InitialScript,
	isConflictError,
} from "@/lib/api-client";
import { artistMutations } from "@/lib/mutation-options";
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
import { Textarea } from "../ui/textarea";
import { ConflictDialog } from "./conflict-dialog";

export interface ArtistFormData {
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	notes: string | null;
	initialScript: InitialScript;
	nameInitial: string | null;
}

export interface ArtistEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	artist?: Artist | null;
	onSuccess?: () => void;
}

export function ArtistEditDialog({
	open,
	onOpenChange,
	mode,
	artist,
	onSuccess,
}: ArtistEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<ArtistFormData>({
		name: "",
		nameJa: null,
		nameEn: null,
		sortName: null,
		notes: null,
		initialScript: "latin",
		nameInitial: null,
	});
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Artist>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<ArtistFormData & Record<string, unknown>>();

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
	const createMutation = useMutation(artistMutations.create(queryClient));
	const updateMutation = useMutation(artistMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: ArtistFormData;
			if (mode === "edit" && artist) {
				initialFormState = {
					name: artist.name,
					nameJa: artist.nameJa,
					nameEn: artist.nameEn,
					sortName: artist.sortName,
					notes: artist.notes,
					initialScript: artist.initialScript,
					nameInitial: artist.nameInitial,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(artist.updatedAt);
			} else {
				initialFormState = {
					name: "",
					nameJa: null,
					nameEn: null,
					sortName: null,
					notes: null,
					initialScript: "latin",
					nameInitial: null,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(null);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as ArtistFormData & Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
			clearConflict();
		}
	}, [open, mode, artist, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as ArtistFormData & Record<string, unknown>);
	}, [form]);

	const handleNameChange = (name: string) => {
		const initial = detectInitial(name);
		if (mode === "create") {
			setForm({
				...form,
				name,
				nameJa: name,
				sortName: name,
				initialScript: initial.initialScript as InitialScript,
				nameInitial: initial.nameInitial,
			});
		} else {
			setForm({
				...form,
				name,
				initialScript: initial.initialScript as InitialScript,
				nameInitial: initial.nameInitial,
			});
		}
	};

	const handleSubmit = (overrideUpdatedAt?: string) => {
		if (!form.name.trim()) {
			return;
		}

		if (mode === "create") {
			const id = createId.artist();
			createMutation.mutate(
				{
					id,
					name: form.name,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					sortName: form.sortName,
					initialScript: form.initialScript,
					nameInitial: form.nameInitial,
					notes: form.notes,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (artist) {
			updateMutation.mutate(
				{
					id: artist.id,
					data: {
						name: form.name,
						nameJa: form.nameJa,
						nameEn: form.nameEn,
						sortName: form.sortName,
						initialScript: form.initialScript,
						nameInitial: form.nameInitial,
						notes: form.notes,
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
					onError: (e) => {
						// 楽観的ロック競合エラーの場合
						if (isConflictError<Artist>(e)) {
							setConflict(e.current);
						}
					},
				},
			);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: Artist) => {
		setForm({
			name: data.name,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			sortName: data.sortName,
			notes: data.notes,
			initialScript: data.initialScript,
			nameInitial: data.nameInitial,
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

	// エラーメッセージの取得（競合エラー以外）
	const displayError =
		mutationError && !isConflictError(mutationError)
			? mutationError instanceof Error
				? mutationError.message
				: mode === "create"
					? "作成に失敗しました"
					: "更新に失敗しました"
			: null;

	const title = mode === "create" ? "新規アーティスト" : "アーティストの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
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
							<Label htmlFor={`${mode}-artist-name`}>
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-artist-name`}
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: ZUN"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-artist-nameJa`}>日本語名</Label>
								<Input
									id={`${mode}-artist-nameJa`}
									value={form.nameJa || ""}
									onChange={(e) =>
										setForm({ ...form, nameJa: e.target.value || null })
									}
									placeholder="例: ZUN"
									disabled={isPending}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-artist-nameEn`}>英語名</Label>
								<Input
									id={`${mode}-artist-nameEn`}
									value={form.nameEn || ""}
									onChange={(e) =>
										setForm({ ...form, nameEn: e.target.value || null })
									}
									placeholder="例: ZUN"
									disabled={isPending}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-artist-sortName`}>ソート用名</Label>
							<Input
								id={`${mode}-artist-sortName`}
								value={form.sortName || ""}
								onChange={(e) =>
									setForm({ ...form, sortName: e.target.value || null })
								}
								placeholder="例: ZUN"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-artist-notes`}>備考</Label>
							<Textarea
								id={`${mode}-artist-notes`}
								value={form.notes || ""}
								onChange={(e) =>
									setForm({ ...form, notes: e.target.value || null })
								}
								placeholder="例: 来歴、特記事項など"
								rows={3}
								disabled={isPending}
							/>
						</div>
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
