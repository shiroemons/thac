import { useEffect, useState } from "react";
import { type Platform, platformsApi } from "@/lib/api-client";
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
import { Select } from "../ui/select";

export interface PlatformFormData {
	code: string;
	name: string;
	category: string;
	urlPattern: string;
}

export interface PlatformEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	platform?: Platform | null;
	currentPlatformsCount?: number;
	onSuccess?: () => void;
}

const categoryOptions = [
	{ value: "streaming", label: "ストリーミング" },
	{ value: "video", label: "動画" },
	{ value: "download", label: "ダウンロード" },
	{ value: "shop", label: "ショップ" },
	{ value: "other", label: "その他" },
];

export function PlatformEditDialog({
	open,
	onOpenChange,
	mode,
	platform,
	currentPlatformsCount,
	onSuccess,
}: PlatformEditDialogProps) {
	const [form, setForm] = useState<PlatformFormData>({
		code: "",
		name: "",
		category: "streaming",
		urlPattern: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && platform) {
				setForm({
					code: platform.code,
					name: platform.name,
					category: platform.category ?? "streaming",
					urlPattern: platform.urlPattern ?? "",
				});
			} else {
				setForm({
					code: "",
					name: "",
					category: "streaming",
					urlPattern: "",
				});
			}
			setError(null);
		}
	}, [open, mode, platform]);

	const handleSubmit = async () => {
		if (!form.code.trim()) {
			setError("コードを入力してください");
			return;
		}
		if (!form.name.trim()) {
			setError("名前を入力してください");
			return;
		}
		if (!form.category.trim()) {
			setError("カテゴリを選択してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				await platformsApi.create({
					code: form.code,
					name: form.name,
					category: form.category,
					urlPattern: form.urlPattern || null,
					sortOrder: currentPlatformsCount ?? 0,
				});
			} else if (platform) {
				await platformsApi.update(platform.code, {
					name: form.name,
					category: form.category,
					urlPattern: form.urlPattern || null,
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
		mode === "create" ? "新規プラットフォーム" : "プラットフォームの編集";

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
						<Label htmlFor="platform-code">
							コード <span className="text-error">*</span>
						</Label>
						<Input
							id="platform-code"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="例: spotify"
							disabled={isSubmitting || mode === "edit"}
						/>
						{mode === "edit" && (
							<p className="text-muted-foreground text-xs">
								コードは変更できません
							</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="platform-name">
							名前 <span className="text-error">*</span>
						</Label>
						<Input
							id="platform-name"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							placeholder="例: Spotify"
							disabled={isSubmitting}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="platform-category">
							カテゴリ <span className="text-error">*</span>
						</Label>
						<Select
							id="platform-category"
							value={form.category}
							onChange={(e) => setForm({ ...form, category: e.target.value })}
							disabled={isSubmitting}
						>
							{categoryOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="platform-urlPattern">URLパターン</Label>
						<Input
							id="platform-urlPattern"
							value={form.urlPattern}
							onChange={(e) => setForm({ ...form, urlPattern: e.target.value })}
							placeholder="例: ^https?://open\.spotify\.com/"
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
						disabled={
							isSubmitting ||
							!form.code.trim() ||
							!form.name.trim() ||
							!form.category.trim()
						}
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
