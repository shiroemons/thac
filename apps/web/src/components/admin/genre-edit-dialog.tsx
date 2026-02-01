import { useMutation, useQueryClient } from "@tanstack/react-query";
import { icons } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { type Genre, isConflictError } from "@/lib/api-client";
import { genreMutations } from "@/lib/mutation-options";
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
import { GenreBadge } from "../ui/genre-badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ConflictDialog } from "./conflict-dialog";

export interface GenreFormData {
	code: string;
	nameJa: string;
	nameEn: string;
	color: string;
	icon: string;
	description: string;
}

export interface GenreEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	genre?: Genre | null;
	currentGenresCount?: number;
	onSuccess?: () => void;
}

// よく使われる音楽ジャンル用アイコンのプリセット
const ICON_PRESETS = [
	"music",
	"guitar",
	"piano",
	"drum",
	"mic",
	"mic-2",
	"headphones",
	"radio",
	"disc",
	"disc-2",
	"disc-3",
	"audio-waveform",
	"volume-2",
	"music-2",
	"music-3",
	"music-4",
	"sparkles",
	"star",
	"heart",
	"zap",
	"flame",
	"cloud",
	"sun",
	"moon",
];

// カラープリセット
const COLOR_PRESETS = [
	"#DC143C", // Crimson (Rock)
	"#228B22", // Forest Green (Jazz)
	"#4169E1", // Royal Blue (Electronic)
	"#FF8C00", // Dark Orange (Pop)
	"#8B008B", // Dark Magenta (Metal)
	"#20B2AA", // Light Sea Green (Ambient)
	"#FFD700", // Gold (Classical)
	"#FF69B4", // Hot Pink (J-Pop)
	"#9370DB", // Medium Purple (Game)
	"#2E8B57", // Sea Green (Folk)
	"#CD853F", // Peru (Country)
	"#708090", // Slate Gray (Hip Hop)
];

/**
 * Lucide icon名からコンポーネントを取得
 */
function getLucideIcon(
	iconName: string,
): React.ComponentType<{ className?: string }> | null {
	// kebab-case を PascalCase に変換
	const pascalCase = iconName
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	const IconComponent = icons[pascalCase as keyof typeof icons];
	return IconComponent || null;
}

export function GenreEditDialog({
	open,
	onOpenChange,
	mode,
	genre,
	currentGenresCount,
	onSuccess,
}: GenreEditDialogProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<GenreFormData>({
		code: "",
		nameJa: "",
		nameEn: "",
		color: "#4169E1",
		icon: "music",
		description: "",
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
		useConflictHandler<Genre>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<GenreFormData & Record<string, unknown>>();

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
	const createMutation = useMutation(genreMutations.create(queryClient));
	const updateMutation = useMutation({
		...genreMutations.update(queryClient),
		onError: (error: Error) => {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<Genre>(error)) {
				setConflict(error.current);
			}
		},
	});

	// ローディング状態とエラー状態
	const isPending = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: GenreFormData;
			if (mode === "edit" && genre) {
				initialFormState = {
					code: genre.code,
					nameJa: genre.nameJa,
					nameEn: genre.nameEn,
					color: genre.color,
					icon: genre.icon,
					description: genre.description ?? "",
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(genre.updatedAt);
			} else {
				initialFormState = {
					code: "",
					nameJa: "",
					nameEn: "",
					color: "#4169E1",
					icon: "music",
					description: "",
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(null);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as GenreFormData & Record<string, unknown>,
			);
			setOverrideUpdatedAt(null);
			clearConflict();
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
		}
	}, [open, mode, genre, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as GenreFormData & Record<string, unknown>);
	}, [form]);

	// コードのバリデーション（英小文字+アンダースコアのみ）
	const isValidCode = useMemo(() => {
		return /^[a-z][a-z0-9_]*$/.test(form.code);
	}, [form.code]);

	// カラーのバリデーション（Hexカラーコード）
	const isValidColor = useMemo(() => {
		return /^#[0-9A-Fa-f]{6}$/.test(form.color);
	}, [form.color]);

	// アイコンのバリデーション（存在するか確認）
	const IconComponent = useMemo(() => {
		return form.icon ? getLucideIcon(form.icon) : null;
	}, [form.icon]);

	const handleSubmit = (submitOverrideUpdatedAt?: string) => {
		if (!form.code.trim() || !isValidCode) {
			return;
		}
		if (!form.nameJa.trim()) {
			return;
		}
		if (!form.nameEn.trim()) {
			return;
		}
		if (!isValidColor) {
			return;
		}

		if (mode === "create") {
			createMutation.mutate(
				{
					code: form.code,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					color: form.color,
					icon: form.icon,
					description: form.description || null,
					sortOrder: currentGenresCount ?? 0,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (genre) {
			updateMutation.mutate(
				{
					code: genre.code,
					data: {
						nameJa: form.nameJa,
						nameEn: form.nameEn,
						color: form.color,
						icon: form.icon,
						description: form.description || null,
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
						formDirty.reset();
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
	const handleContinueEditing = (data: Genre) => {
		setForm({
			code: data.code,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			color: data.color,
			icon: data.icon,
			description: data.description ?? "",
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

	const title = mode === "create" ? "新規ジャンル" : "ジャンルの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<DialogBody className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-lg bg-error p-4 text-error-content text-sm">
								{displayError}
							</div>
						)}

						{/* プレビュー */}
						<div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/50 p-3">
							<span className="text-base-content/60 text-sm">プレビュー:</span>
							<GenreBadge
								code={form.code || "preview"}
								name={form.nameJa || "ジャンル名"}
								color={isValidColor ? form.color : "#808080"}
								icon={IconComponent ? form.icon : undefined}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor={`${mode}-genre-code`}>
								コード <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-genre-code`}
								value={form.code}
								onChange={(e) =>
									setForm({ ...form, code: e.target.value.toLowerCase() })
								}
								placeholder="例: rock"
								disabled={isPending || mode === "edit"}
								autoComplete="off"
							/>
							{mode === "edit" ? (
								<p className="text-muted-foreground text-sm">
									コードは変更できません
								</p>
							) : (
								<p className="text-muted-foreground text-sm">
									英小文字とアンダースコアのみ（例: j_pop, game_music）
								</p>
							)}
							{form.code && !isValidCode && (
								<p className="text-error text-sm">
									無効なコード形式です。英小文字で始まり、英小文字・数字・アンダースコアのみ使用可能です。
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-genre-nameJa`}>
									日本語名 <span className="text-error">*</span>
								</Label>
								<Input
									id={`${mode}-genre-nameJa`}
									value={form.nameJa}
									onChange={(e) => setForm({ ...form, nameJa: e.target.value })}
									placeholder="例: ロック"
									disabled={isPending}
									autoComplete="off"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-genre-nameEn`}>
									英語名 <span className="text-error">*</span>
								</Label>
								<Input
									id={`${mode}-genre-nameEn`}
									value={form.nameEn}
									onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
									placeholder="例: Rock"
									disabled={isPending}
									autoComplete="off"
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor={`${mode}-genre-color`}>
								カラー <span className="text-error">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<Input
									id={`${mode}-genre-color`}
									type="text"
									value={form.color}
									onChange={(e) => setForm({ ...form, color: e.target.value })}
									placeholder="#RRGGBB"
									disabled={isPending}
									autoComplete="off"
									className="flex-1"
								/>
								<input
									type="color"
									value={isValidColor ? form.color : "#808080"}
									onChange={(e) => setForm({ ...form, color: e.target.value })}
									disabled={isPending}
									className="h-10 w-10 cursor-pointer rounded border border-base-300"
								/>
							</div>
							<div className="flex flex-wrap gap-1">
								{COLOR_PRESETS.map((color) => (
									<button
										key={color}
										type="button"
										onClick={() => setForm({ ...form, color })}
										className="size-6 rounded border border-base-300 transition-transform hover:scale-110"
										style={{ backgroundColor: color }}
										title={color}
									/>
								))}
							</div>
							{form.color && !isValidColor && (
								<p className="text-error text-sm">
									無効なカラー形式です。#RRGGBB形式で入力してください。
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor={`${mode}-genre-icon`}>
								アイコン <span className="text-error">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<Input
									id={`${mode}-genre-icon`}
									value={form.icon}
									onChange={(e) => setForm({ ...form, icon: e.target.value })}
									placeholder="例: music"
									disabled={isPending}
									autoComplete="off"
									className="flex-1"
								/>
								{IconComponent && (
									<div className="flex size-10 items-center justify-center rounded border border-base-300 bg-base-200">
										<IconComponent className="size-5" />
									</div>
								)}
							</div>
							<div className="flex flex-wrap gap-1">
								{ICON_PRESETS.map((iconName) => {
									const Icon = getLucideIcon(iconName);
									if (!Icon) return null;
									return (
										<button
											key={iconName}
											type="button"
											onClick={() => setForm({ ...form, icon: iconName })}
											className={`flex size-8 items-center justify-center rounded border transition-colors hover:bg-base-200 ${
												form.icon === iconName
													? "border-primary bg-primary/10"
													: "border-base-300"
											}`}
											title={iconName}
										>
											<Icon className="size-4" />
										</button>
									);
								})}
							</div>
							<p className="text-muted-foreground text-sm">
								<a
									href="https://lucide.dev/icons/"
									target="_blank"
									rel="noopener noreferrer"
									className="link link-primary"
								>
									Lucide Icons
								</a>
								からアイコン名を入力（kebab-case形式）
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor={`${mode}-genre-description`}>説明</Label>
							<Input
								id={`${mode}-genre-description`}
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
								placeholder="例: ギター・ドラム中心のエネルギッシュなサウンド"
								disabled={isPending}
								autoComplete="off"
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
							onClick={() => handleSubmit()}
							disabled={
								isPending ||
								!form.code.trim() ||
								!isValidCode ||
								!form.nameJa.trim() ||
								!form.nameEn.trim() ||
								!isValidColor
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
				getDisplayName={(data) => data.nameJa}
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
