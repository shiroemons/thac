import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AliasType } from "@/lib/api-client";
import { aliasTypeMutations } from "@/lib/mutation-options";
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

	// useMutation hooks
	const createMutation = useMutation(aliasTypeMutations.create(queryClient));
	const updateMutation = useMutation(aliasTypeMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && aliasType) {
				setForm({
					code: aliasType.code,
					label: aliasType.label,
					description: aliasType.description,
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
	}, [open, mode, aliasType, createMutation.reset, updateMutation.reset]);

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
						<Label htmlFor="alias-type-code">
							コード <span className="text-error">*</span>
						</Label>
						<Input
							id="alias-type-code"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="例: romanization"
							disabled={isPending || mode === "edit"}
						/>
						{mode === "edit" && (
							<p className="text-muted-foreground text-xs">
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
