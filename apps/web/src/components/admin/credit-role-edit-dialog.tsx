import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CreditRole } from "@/lib/api-client";
import { creditRoleMutations } from "@/lib/mutation-options";
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
import { Textarea } from "../ui/textarea";

export interface CreditRoleFormData {
	code: string;
	label: string;
	description: string | null;
}

export interface CreditRoleEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	creditRole?: CreditRole | null;
	onSuccess?: () => void;
}

export function CreditRoleEditDialog({
	open,
	onOpenChange,
	mode,
	creditRole,
	onSuccess,
}: CreditRoleEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<CreditRoleFormData>({
		code: "",
		label: "",
		description: null,
	});

	// useMutation hooks
	const createMutation = useMutation(creditRoleMutations.create(queryClient));
	const updateMutation = useMutation(creditRoleMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && creditRole) {
				setForm({
					code: creditRole.code,
					label: creditRole.label,
					description: creditRole.description,
				});
			} else {
				setForm({
					code: "",
					label: "",
					description: null,
				});
			}
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [open, mode, creditRole, createMutation.reset, updateMutation.reset]);

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
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (creditRole) {
			updateMutation.mutate(
				{
					code: creditRole.code,
					data: {
						label: form.label,
						description: form.description,
					},
				},
				{
					onSuccess: () => {
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
		mode === "create" ? "新規クレジット役割" : "クレジット役割の編集";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{displayError && (
						<div className="rounded-md bg-error/10 p-3 text-error text-sm">
							{displayError}
						</div>
					)}
					<div className="grid gap-2">
						<Label htmlFor="credit-role-code">
							コード <span className="text-error">*</span>
						</Label>
						<Input
							id="credit-role-code"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="例: composer"
							disabled={isPending || mode === "edit"}
						/>
						{mode === "edit" && (
							<p className="text-muted-foreground text-xs">
								コードは変更できません
							</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="credit-role-label">
							ラベル <span className="text-error">*</span>
						</Label>
						<Input
							id="credit-role-label"
							value={form.label}
							onChange={(e) => setForm({ ...form, label: e.target.value })}
							placeholder="例: 作曲"
							disabled={isPending}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="credit-role-description">説明</Label>
						<Textarea
							id="credit-role-description"
							value={form.description || ""}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value || null })
							}
							placeholder="例: 楽曲の作曲を担当したクレジット"
							rows={3}
							disabled={isPending}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
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
	);
}
