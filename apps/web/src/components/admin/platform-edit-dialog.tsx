import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { isConflictError, type Platform } from "@/lib/api-client";
import { platformMutations } from "@/lib/mutation-options";
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
import { ConflictDialog } from "./conflict-dialog";

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
	{ value: "", label: "未選択" },
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
	const queryClient = useQueryClient();
	const [form, setForm] = useState<PlatformFormData>({
		code: "",
		name: "",
		category: "",
		urlPattern: "",
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
		useConflictHandler<Platform>();

	// useMutation hooks
	const createMutation = useMutation(platformMutations.create(queryClient));
	const updateMutation = useMutation({
		...platformMutations.update(queryClient),
		onError: (error: Error) => {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<Platform>(error)) {
				setConflict(error.current);
			}
		},
	});

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && platform) {
				setForm({
					code: platform.code,
					name: platform.name,
					category: platform.category ?? "",
					urlPattern: platform.urlPattern ?? "",
				});
				setOriginalUpdatedAt(platform.updatedAt);
			} else {
				setForm({
					code: "",
					name: "",
					category: "",
					urlPattern: "",
				});
				setOriginalUpdatedAt(null);
			}
			setOverrideUpdatedAt(null);
			clearConflict();
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [
		open,
		mode,
		platform,
		clearConflict,
		createMutation.reset,
		updateMutation.reset,
	]);

	const handleSubmit = (submitOverrideUpdatedAt?: string) => {
		if (!form.code.trim()) {
			return;
		}
		if (!form.name.trim()) {
			return;
		}
		if (!form.category.trim()) {
			return;
		}

		if (mode === "create") {
			createMutation.mutate(
				{
					code: form.code,
					name: form.name,
					category: form.category,
					urlPattern: form.urlPattern || null,
					sortOrder: currentPlatformsCount ?? 0,
				},
				{
					onSuccess: () => {
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (platform) {
			updateMutation.mutate(
				{
					code: platform.code,
					data: {
						name: form.name,
						category: form.category,
						urlPattern: form.urlPattern || null,
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
	const handleContinueEditing = (data: Platform) => {
		setForm({
			code: data.code,
			name: data.name,
			category: data.category ?? "",
			urlPattern: data.urlPattern ?? "",
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
		mode === "create" ? "新規プラットフォーム" : "プラットフォームの編集";

	return (
		<>
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
							<Label htmlFor={`${mode}-platform-code`}>
								コード <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-platform-code`}
								value={form.code}
								onChange={(e) => setForm({ ...form, code: e.target.value })}
								placeholder="例: spotify"
								disabled={isPending || mode === "edit"}
								autoComplete="off"
							/>
							{mode === "edit" && (
								<p className="text-muted-foreground text-xs">
									コードは変更できません
								</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-platform-name`}>
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-platform-name`}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: Spotify"
								disabled={isPending}
								autoComplete="off"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-platform-category`}>
								カテゴリ <span className="text-error">*</span>
							</Label>
							<Select
								id={`${mode}-platform-category`}
								value={form.category}
								onChange={(e) => setForm({ ...form, category: e.target.value })}
								disabled={isPending}
							>
								{categoryOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-platform-urlPattern`}>URLパターン</Label>
							<Input
								id={`${mode}-platform-urlPattern`}
								value={form.urlPattern}
								onChange={(e) =>
									setForm({ ...form, urlPattern: e.target.value })
								}
								placeholder="例: ^https?://open\.spotify\.com/"
								disabled={isPending}
								autoComplete="off"
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
							onClick={() => handleSubmit()}
							disabled={
								isPending ||
								!form.code.trim() ||
								!form.name.trim() ||
								!form.category.trim()
							}
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
		</>
	);
}
