import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { useEffect, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	type Circle,
	type InitialScript,
	isConflictError,
} from "@/lib/api-client";
import { circleMutations } from "@/lib/mutation-options";
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
import { ConflictDialog } from "./conflict-dialog";

export interface CircleFormData {
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	notes: string | null;
	initialScript: InitialScript;
	nameInitial: string | null;
}

export interface CircleEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	circle?: Circle | null;
	onSuccess?: () => void;
}

export function CircleEditDialog({
	open,
	onOpenChange,
	mode,
	circle,
	onSuccess,
}: CircleEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<CircleFormData>({
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
		useConflictHandler<Circle>();

	// useMutation hooks
	const createMutation = useMutation(circleMutations.create(queryClient));
	const updateMutation = useMutation(circleMutations.update(queryClient));

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			if (mode === "edit" && circle) {
				setForm({
					name: circle.name,
					nameJa: circle.nameJa,
					nameEn: circle.nameEn,
					sortName: circle.sortName,
					notes: circle.notes,
					initialScript: circle.initialScript,
					nameInitial: circle.nameInitial,
				});
				setOriginalUpdatedAt(circle.updatedAt);
			} else {
				setForm({
					name: "",
					nameJa: null,
					nameEn: null,
					sortName: null,
					notes: null,
					initialScript: "latin",
					nameInitial: null,
				});
				setOriginalUpdatedAt(null);
			}
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
			clearConflict();
		}
	}, [open, mode, circle, clearConflict]);

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
			const id = createId.circle();
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
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (circle) {
			updateMutation.mutate(
				{
					id: circle.id,
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
						onOpenChange(false);
						onSuccess?.();
					},
					onError: (e) => {
						// 楽観的ロック競合エラーの場合
						if (isConflictError<Circle>(e)) {
							setConflict(e.current);
						}
					},
				},
			);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: Circle) => {
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

	const title = mode === "create" ? "新規サークル" : "サークルの編集";

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
							<Label htmlFor="circle-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="circle-name"
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: 上海アリス幻樂団"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="circle-nameJa">日本語名</Label>
								<Input
									id="circle-nameJa"
									value={form.nameJa || ""}
									onChange={(e) =>
										setForm({ ...form, nameJa: e.target.value || null })
									}
									placeholder="例: 上海アリス幻樂団"
									disabled={isPending}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="circle-nameEn">英語名</Label>
								<Input
									id="circle-nameEn"
									value={form.nameEn || ""}
									onChange={(e) =>
										setForm({ ...form, nameEn: e.target.value || null })
									}
									placeholder="例: Team Shanghai Alice"
									disabled={isPending}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="circle-sortName">ソート用名</Label>
							<Input
								id="circle-sortName"
								value={form.sortName || ""}
								onChange={(e) =>
									setForm({ ...form, sortName: e.target.value || null })
								}
								placeholder="例: 上海アリス幻樂団"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="circle-notes">備考</Label>
							<Textarea
								id="circle-notes"
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
							onClick={() => onOpenChange(false)}
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
		</>
	);
}
