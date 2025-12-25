import { useEffect, useState } from "react";
import {
	type OfficialWorkCategory,
	officialWorkCategoriesApi,
} from "@/lib/api-client";
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
	const [form, setForm] = useState<OfficialWorkCategoryFormData>({
		code: "",
		name: "",
		description: null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && category) {
				setForm({
					code: category.code,
					name: category.name,
					description: category.description,
				});
			} else {
				setForm({
					code: "",
					name: "",
					description: null,
				});
			}
			setError(null);
		}
	}, [open, mode, category]);

	const handleSubmit = async () => {
		if (!form.code.trim()) {
			setError("コードを入力してください");
			return;
		}
		if (!form.name.trim()) {
			setError("名前を入力してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				await officialWorkCategoriesApi.create({
					code: form.code,
					name: form.name,
					description: form.description,
				});
			} else if (category) {
				await officialWorkCategoriesApi.update(category.code, {
					name: form.name,
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
		mode === "create" ? "新規公式作品カテゴリ" : "公式作品カテゴリの編集";

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
						<Label htmlFor="category-code">
							コード <span className="text-error">*</span>
						</Label>
						<Input
							id="category-code"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="例: windows"
							disabled={isSubmitting || mode === "edit"}
						/>
						{mode === "edit" && (
							<p className="text-muted-foreground text-xs">
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
							disabled={isSubmitting}
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
						disabled={isSubmitting || !form.code.trim() || !form.name.trim()}
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
