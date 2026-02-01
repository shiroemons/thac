import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { AliasType } from "@/lib/api-client";
import { aliasTypeMutations } from "@/lib/mutation-options";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export interface AliasTypeFormData {
	code: string;
	label: string;
	description: string | null;
}

export interface AliasTypeEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	aliasType?: AliasType | null;
	onSuccess?: () => void;
}

export function AliasTypeEditDialog({
	open,
	onOpenChange,
	mode,
	aliasType,
	onSuccess,
}: AliasTypeEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<AliasTypeFormData>({
		code: "",
		label: "",
		description: null,
	});

	// フォーム変更検出フック
	const formDirty = useFormDirty<AliasTypeFormData & Record<string, unknown>>();

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
	const createMutation = useMutation(aliasTypeMutations.create(queryClient));
	const updateMutation = useMutation(aliasTypeMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: AliasTypeFormData;
			if (mode === "edit" && aliasType) {
				initialFormState = {
					code: aliasType.code,
					label: aliasType.label,
					description: aliasType.description,
				};
				setForm(initialFormState);
			} else {
				initialFormState = {
					code: "",
					label: "",
					description: null,
				};
				setForm(initialFormState);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as AliasTypeFormData & Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [open, mode, aliasType]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as AliasTypeFormData & Record<string, unknown>);
	}, [form]);

	const handleSubmit = () => {
		if (!form.code.trim()) {
			return;
		}
		if (!form.label.trim()) {
			return;
		}

		if (mode === "create") {
			createMutation.mutate(
				{
					code: form.code,
					label: form.label,
					description: form.description,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (aliasType) {
			updateMutation.mutate(
				{
					code: aliasType.code,
					data: {
						label: form.label,
						description: form.description,
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

	// エラーメッセージの取得
	const displayError = mutationError
		? mutationError instanceof Error
			? mutationError.message
			: mode === "create"
				? "作成に失敗しました"
				: "更新に失敗しました"
		: null;

	const title = mode === "create" ? "新規名義種別" : "名義種別の編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<DialogBody className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-lg bg-error p-4 text-error-content text-sm">
								{displayError}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="alias-type-code">
								コード <span className="text-error">*</span>
							</Label>
							<Input
								id="alias-type-code"
								value={form.code}
								onChange={(e) => setForm({ ...form, code: e.target.value })}
								placeholder="例: romanization"
								disabled={isPending || mode === "edit"}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
							{mode === "edit" && (
								<p className="text-muted-foreground text-sm">
									コードは変更できません
								</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="alias-type-label">
								ラベル <span className="text-error">*</span>
							</Label>
							<Input
								id="alias-type-label"
								value={form.label}
								onChange={(e) => setForm({ ...form, label: e.target.value })}
								placeholder="例: ローマ字表記"
								disabled={isPending}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="alias-type-description">説明</Label>
							<Textarea
								id="alias-type-description"
								value={form.description || ""}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value || null })
								}
								placeholder="例: アーティスト名のローマ字表記"
								rows={3}
								disabled={isPending}
							/>
						</div>
					</DialogBody>
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
							onClick={handleSubmit}
							disabled={isPending || !form.code.trim() || !form.label.trim()}
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
