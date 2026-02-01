import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
	type Artist,
	type ArtistAlias,
	aliasTypesApi,
	artistsApi,
	type InitialScript,
	isConflictError,
} from "@/lib/api-client";
import { artistAliasMutations, artistMutations } from "@/lib/mutation-options";
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
import { SearchableSelect } from "../ui/searchable-select";
import { Select } from "../ui/select";
import { ConflictDialog } from "./conflict-dialog";

export interface ArtistAliasFormData {
	name: string;
	artistId: string;
	aliasTypeCode: string | null;
	initialScript: InitialScript;
	nameInitial: string | null;
	periodFrom: string | null;
	periodTo: string | null;
}

export interface ArtistAliasEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	alias?: ArtistAlias | null;
	artistId?: string; // create モード時のデフォルトアーティストID
	onSuccess?: () => void;
}

export function ArtistAliasEditDialog({
	open,
	onOpenChange,
	mode,
	alias,
	artistId: defaultArtistId,
	onSuccess,
}: ArtistAliasEditDialogProps) {
	const queryClient = useQueryClient();

	const [form, setForm] = useState<ArtistAliasFormData>({
		name: "",
		artistId: "",
		aliasTypeCode: "main",
		initialScript: "latin",
		nameInitial: null,
		periodFrom: null,
		periodTo: null,
	});
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<ArtistAlias>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<
		ArtistAliasFormData & Record<string, unknown>
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

	// アーティスト作成用ネストダイアログ
	const [isArtistCreateDialogOpen, setIsArtistCreateDialogOpen] =
		useState(false);
	const [artistCreateForm, setArtistCreateForm] = useState<Partial<Artist>>({
		initialScript: "latin",
	});

	// useMutation hooks
	const createMutation = useMutation(artistAliasMutations.create(queryClient));
	const updateMutation = useMutation(artistAliasMutations.update(queryClient));
	const artistCreateMutation = useMutation(artistMutations.create(queryClient));

	// ローディング状態とエラー状態
	const isPending =
		createMutation.isPending ||
		updateMutation.isPending ||
		artistCreateMutation.isPending;
	const mutationError =
		createMutation.error || updateMutation.error || artistCreateMutation.error;

	// アーティスト一覧取得
	const { data: artistsData } = useQuery({
		queryKey: ["artists", "all"],
		queryFn: () => artistsApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});
	const artists = artistsData?.data ?? [];

	const artistOptions = useMemo(
		() => artists.map((a) => ({ value: a.id, label: a.name })),
		[artists],
	);

	// 名義種別一覧取得
	const { data: aliasTypesData } = useQuery({
		queryKey: ["aliasTypes", "all"],
		queryFn: () => aliasTypesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});
	const aliasTypes = aliasTypesData?.data ?? [];

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: ArtistAliasFormData;
			if (mode === "edit" && alias) {
				initialFormState = {
					name: alias.name,
					artistId: alias.artistId,
					aliasTypeCode: alias.aliasTypeCode,
					initialScript: alias.initialScript,
					nameInitial: alias.nameInitial,
					periodFrom: alias.periodFrom,
					periodTo: alias.periodTo,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(alias.updatedAt);
			} else {
				initialFormState = {
					name: "",
					artistId: defaultArtistId || "",
					aliasTypeCode: "main",
					initialScript: "latin",
					nameInitial: null,
					periodFrom: null,
					periodTo: null,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(null);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as ArtistAliasFormData & Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
			artistCreateMutation.reset();
			clearConflict();
		}
	}, [open, mode, alias, defaultArtistId, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as ArtistAliasFormData & Record<string, unknown>);
	}, [form]);

	const handleNameChange = (name: string) => {
		const initial = detectInitial(name);
		setForm({
			...form,
			name,
			initialScript: initial.initialScript as InitialScript,
			nameInitial: initial.nameInitial,
		});
	};

	// アーティスト作成（ネストダイアログから）
	const handleArtistCreate = () => {
		const id = createId.artist();
		const initial = detectInitial(artistCreateForm.name || "");
		artistCreateMutation.mutate(
			{
				id,
				name: artistCreateForm.name || "",
				nameJa: artistCreateForm.nameJa || null,
				nameEn: artistCreateForm.nameEn || null,
				sortName: artistCreateForm.sortName || null,
				nameInitial: initial.nameInitial,
				initialScript: initial.initialScript as InitialScript,
				notes: artistCreateForm.notes || null,
			},
			{
				onSuccess: (newArtist) => {
					setForm({ ...form, artistId: newArtist.id });
					setIsArtistCreateDialogOpen(false);
					setArtistCreateForm({ initialScript: "latin" });
				},
			},
		);
	};

	const handleSubmit = (overrideUpdatedAt?: string) => {
		if (!form.name.trim() || !form.artistId) {
			return;
		}

		if (mode === "create") {
			const id = createId.artistAlias();
			createMutation.mutate(
				{
					id,
					name: form.name,
					artistId: form.artistId,
					aliasTypeCode: form.aliasTypeCode,
					initialScript: form.initialScript,
					nameInitial: form.nameInitial,
					periodFrom: form.periodFrom || null,
					periodTo: form.periodTo || null,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (alias) {
			updateMutation.mutate(
				{
					id: alias.id,
					artistId: form.artistId,
					data: {
						name: form.name,
						aliasTypeCode: form.aliasTypeCode,
						initialScript: form.initialScript,
						nameInitial: form.nameInitial,
						periodFrom: form.periodFrom || null,
						periodTo: form.periodTo || null,
						// 楽観的ロック: updatedAtを送信
						updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
					},
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
					onError: (e) => {
						// 楽観的ロック競合エラーの場合
						if (isConflictError<ArtistAlias>(e)) {
							setConflict(e.current);
						}
					},
				},
			);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: ArtistAlias) => {
		setForm({
			name: data.name,
			artistId: data.artistId,
			aliasTypeCode: data.aliasTypeCode,
			initialScript: data.initialScript,
			nameInitial: data.nameInitial,
			periodFrom: data.periodFrom,
			periodTo: data.periodTo,
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

	const title =
		mode === "create" ? "新規アーティスト名義" : "アーティスト名義の編集";

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
							<Label htmlFor={`${mode}-alias-name`}>
								名義名 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-alias-name`}
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: ZUN"
								disabled={isPending}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor={`${mode}-alias-artist`}>
									アーティスト <span className="text-error">*</span>
								</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-primary text-sm hover:underline"
									onClick={() => setIsArtistCreateDialogOpen(true)}
									disabled={isPending}
								>
									+ 新規アーティスト作成
								</Button>
							</div>
							<SearchableSelect
								id={`${mode}-alias-artist`}
								value={form.artistId}
								onChange={(val) => setForm({ ...form, artistId: val })}
								options={artistOptions}
								placeholder="アーティストを選択..."
								searchPlaceholder="アーティストを検索..."
								emptyMessage="アーティストが見つかりません"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-alias-type`}>名義種別</Label>
							<Select
								id={`${mode}-alias-type`}
								value={form.aliasTypeCode || ""}
								onChange={(e) =>
									setForm({ ...form, aliasTypeCode: e.target.value || null })
								}
								disabled={isPending}
							>
								<option value="">選択なし</option>
								{aliasTypes.map((type) => (
									<option key={type.code} value={type.code}>
										{type.label}
									</option>
								))}
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-period-from`}>活動開始</Label>
								<Input
									id={`${mode}-period-from`}
									type="month"
									value={form.periodFrom || ""}
									onChange={(e) =>
										setForm({ ...form, periodFrom: e.target.value || null })
									}
									disabled={isPending}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-period-to`}>活動終了</Label>
								<Input
									id={`${mode}-period-to`}
									type="month"
									value={form.periodTo || ""}
									onChange={(e) =>
										setForm({ ...form, periodTo: e.target.value || null })
									}
									disabled={isPending}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
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
							disabled={isPending || !form.name.trim() || !form.artistId}
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

			{/* アーティスト作成ダイアログ */}
			<Dialog
				open={isArtistCreateDialogOpen}
				onOpenChange={setIsArtistCreateDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規アーティスト作成</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-new-artist-name`}>
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-new-artist-name`}
								value={artistCreateForm.name || ""}
								onChange={(e) => {
									const name = e.target.value;
									setArtistCreateForm({
										...artistCreateForm,
										name,
										nameJa: name,
										sortName: name,
									});
								}}
								placeholder="例: ZUN"
								disabled={isPending}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-new-artist-nameJa`}>日本語名</Label>
								<Input
									id={`${mode}-new-artist-nameJa`}
									value={artistCreateForm.nameJa || ""}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											nameJa: e.target.value,
										})
									}
									disabled={isPending}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-new-artist-nameEn`}>英語名</Label>
								<Input
									id={`${mode}-new-artist-nameEn`}
									value={artistCreateForm.nameEn || ""}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											nameEn: e.target.value,
										})
									}
									disabled={isPending}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-new-artist-sortName`}>ソート用名</Label>
							<Input
								id={`${mode}-new-artist-sortName`}
								value={artistCreateForm.sortName || ""}
								onChange={(e) =>
									setArtistCreateForm({
										...artistCreateForm,
										sortName: e.target.value,
									})
								}
								disabled={isPending}
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
								data-form-type="other"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsArtistCreateDialogOpen(false)}
							disabled={isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleArtistCreate}
							disabled={isPending || !artistCreateForm.name?.trim()}
						>
							{isPending ? "作成中..." : "作成"}
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
