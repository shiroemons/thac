import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { OfficialWorkCategory } from "@/lib/api-client";
import { officialWorkCategoryMutations } from "@/lib/mutation-options";
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

export interface OfficialWorkCategoryFormData {
	code: string;
	name: string;
	description: string | null;
}

export interface OfficialWorkCategoryEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	category?: OfficialWorkCategory | null;
	onSuccess?: () => void;
}

export function OfficialWorkCategoryEditDialog({
	open,
	onOpenChange,
	mode,
	category,
	onSuccess,
}: OfficialWorkCategoryEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<OfficialWorkCategoryFormData>({
		code: "",
		name: "",
		description: null,
	});

	// フォーム変更検出フック
	const formDirty = useFormDirty<
		OfficialWorkCategoryFormData & Record<string, unknown>
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
	const createMutation = useMutation(
		officialWorkCategoryMutations.create(queryClient),
	);
	const updateMutation = useMutation(
		officialWorkCategoryMutations.update(queryClient),
	);

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: OfficialWorkCategoryFormData;
			if (mode === "edit" && category) {
				initialFormState = {
					code: category.code,
					name: category.name,
					description: category.description,
				};
				setForm(initialFormState);
			} else {
				initialFormState = {
					code: "",
					name: "",
					description: null,
				};
				setForm(initialFormState);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as OfficialWorkCategoryFormData &
					Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [open, mode, category]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(
			form as OfficialWorkCategoryFormData & Record<string, unknown>,
		);
	}, [form]);

	const handleSubmit = () => {
		if (!form.code.trim()) {
			return;
		}
		if (!form.name.trim()) {
			return;
		}

		if (mode === "create") {
			createMutation.mutate(
				{
					code: form.code,
					name: form.name,
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
		} else if (category) {
			updateMutation.mutate(
				{
					code: category.code,
					data: {
						name: form.name,
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

	const title =
		mode === "create" ? "新規公式作品カテゴリ" : "公式作品カテゴリの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-lg bg-error/10 p-4 text-error text-sm">
								{displayError}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="category-code">
								コード <span className="text-error">*</span>
							</Label>
							<Input
								id="category-code"
								value={form.code}
								onChange={(e) => setForm({ ...form, code: e.target.value })}
								placeholder="例: windows"
								disabled={isPending || mode === "edit"}
								autoComplete="off"
							/>
							{mode === "edit" && (
								<p className="text-muted-foreground text-sm">
									コードは変更できません
								</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="category-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="category-name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: Windows作品"
								disabled={isPending}
								autoComplete="off"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="category-description">説明</Label>
							<Textarea
								id="category-description"
								value={form.description || ""}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value || null })
								}
								placeholder="例: Windows向けにリリースされた作品"
								rows={3}
								disabled={isPending}
								autoComplete="off"
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
							onClick={handleSubmit}
							disabled={isPending || !form.code.trim() || !form.name.trim()}
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
