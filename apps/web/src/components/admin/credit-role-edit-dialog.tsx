import { useEffect, useState } from "react";
import { type CreditRole, creditRolesApi } from "@/lib/api-client";
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
	const [form, setForm] = useState<CreditRoleFormData>({
		code: "",
		label: "",
		description: null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
			setError(null);
		}
	}, [open, mode, creditRole]);

	const handleSubmit = async () => {
		if (!form.code.trim()) {
			setError("コードを入力してください");
			return;
		}
		if (!form.label.trim()) {
			setError("ラベルを入力してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				await creditRolesApi.create({
					code: form.code,
					label: form.label,
					description: form.description,
				});
			} else if (creditRole) {
				await creditRolesApi.update(creditRole.code, {
					label: form.label,
					description: form.description,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: mode === "create"
						? "作成に失敗しました"
						: "更新に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const title =
		mode === "create" ? "新規クレジット役割" : "クレジット役割の編集";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{error && (
						<div className="rounded-md bg-error/10 p-3 text-error text-sm">
							{error}
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
							disabled={isSubmitting || mode === "edit"}
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
							disabled={isSubmitting}
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
							disabled={isSubmitting}
						/>
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
						onClick={handleSubmit}
						disabled={isSubmitting || !form.code.trim() || !form.label.trim()}
					>
						{isSubmitting
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
