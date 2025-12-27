import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { useEffect, useMemo, useState } from "react";
import {
	type Artist,
	type ArtistAlias,
	aliasTypesApi,
	artistAliasesApi,
	artistsApi,
	type InitialScript,
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
import { SearchableSelect } from "../ui/searchable-select";
import { Select } from "../ui/select";

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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// アーティスト作成用ネストダイアログ
	const [isArtistCreateDialogOpen, setIsArtistCreateDialogOpen] =
		useState(false);
	const [artistCreateForm, setArtistCreateForm] = useState<Partial<Artist>>({
		initialScript: "latin",
	});

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
	useEffect(() => {
		if (open) {
			if (mode === "edit" && alias) {
				setForm({
					name: alias.name,
					artistId: alias.artistId,
					aliasTypeCode: alias.aliasTypeCode,
					initialScript: alias.initialScript,
					nameInitial: alias.nameInitial,
					periodFrom: alias.periodFrom,
					periodTo: alias.periodTo,
				});
			} else {
				setForm({
					name: "",
					artistId: defaultArtistId || "",
					aliasTypeCode: "main",
					initialScript: "latin",
					nameInitial: null,
					periodFrom: null,
					periodTo: null,
				});
			}
			setError(null);
		}
	}, [open, mode, alias, defaultArtistId]);

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
	const handleArtistCreate = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			const id = createId.artist();
			const initial = detectInitial(artistCreateForm.name || "");
			const newArtist = await artistsApi.create({
				id,
				name: artistCreateForm.name || "",
				nameJa: artistCreateForm.nameJa || null,
				nameEn: artistCreateForm.nameEn || null,
				sortName: artistCreateForm.sortName || null,
				nameInitial: initial.nameInitial,
				initialScript: initial.initialScript as InitialScript,
				notes: artistCreateForm.notes || null,
			});
			queryClient.invalidateQueries({ queryKey: ["artists"] });
			setForm({ ...form, artistId: newArtist.id });
			setIsArtistCreateDialogOpen(false);
			setArtistCreateForm({ initialScript: "latin" });
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "アーティストの作成に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async () => {
		if (!form.name.trim()) {
			setError("名義名を入力してください");
			return;
		}
		if (!form.artistId) {
			setError("アーティストを選択してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				const id = createId.artistAlias();
				await artistAliasesApi.create({
					id,
					name: form.name,
					artistId: form.artistId,
					aliasTypeCode: form.aliasTypeCode,
					initialScript: form.initialScript,
					nameInitial: form.nameInitial,
					periodFrom: form.periodFrom || null,
					periodTo: form.periodTo || null,
				});
			} else if (alias) {
				await artistAliasesApi.update(alias.id, {
					name: form.name,
					artistId: form.artistId,
					aliasTypeCode: form.aliasTypeCode,
					initialScript: form.initialScript,
					nameInitial: form.nameInitial,
					periodFrom: form.periodFrom || null,
					periodTo: form.periodTo || null,
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
		mode === "create" ? "新規アーティスト名義" : "アーティスト名義の編集";

	return (
		<>
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
							<Label htmlFor="alias-name">
								名義名 <span className="text-error">*</span>
							</Label>
							<Input
								id="alias-name"
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: ZUN"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label>
									アーティスト <span className="text-error">*</span>
								</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-primary text-xs hover:underline"
									onClick={() => setIsArtistCreateDialogOpen(true)}
									disabled={isSubmitting}
								>
									+ 新規アーティスト作成
								</Button>
							</div>
							<SearchableSelect
								value={form.artistId}
								onChange={(val) => setForm({ ...form, artistId: val })}
								options={artistOptions}
								placeholder="アーティストを選択..."
								searchPlaceholder="アーティストを検索..."
								emptyMessage="アーティストが見つかりません"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="alias-type">名義種別</Label>
							<Select
								id="alias-type"
								value={form.aliasTypeCode || ""}
								onChange={(e) =>
									setForm({ ...form, aliasTypeCode: e.target.value || null })
								}
								disabled={isSubmitting}
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
								<Label htmlFor="period-from">活動開始</Label>
								<Input
									id="period-from"
									type="month"
									value={form.periodFrom || ""}
									onChange={(e) =>
										setForm({ ...form, periodFrom: e.target.value || null })
									}
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="period-to">活動終了</Label>
								<Input
									id="period-to"
									type="month"
									value={form.periodTo || ""}
									onChange={(e) =>
										setForm({ ...form, periodTo: e.target.value || null })
									}
									disabled={isSubmitting}
								/>
							</div>
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
							disabled={isSubmitting || !form.name.trim() || !form.artistId}
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
							<Label htmlFor="artist-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="artist-name"
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
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="artist-nameJa">日本語名</Label>
								<Input
									id="artist-nameJa"
									value={artistCreateForm.nameJa || ""}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											nameJa: e.target.value,
										})
									}
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="artist-nameEn">英語名</Label>
								<Input
									id="artist-nameEn"
									value={artistCreateForm.nameEn || ""}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											nameEn: e.target.value,
										})
									}
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="artist-sortName">ソート用名</Label>
							<Input
								id="artist-sortName"
								value={artistCreateForm.sortName || ""}
								onChange={(e) =>
									setArtistCreateForm({
										...artistCreateForm,
										sortName: e.target.value,
									})
								}
								disabled={isSubmitting}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsArtistCreateDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleArtistCreate}
							disabled={isSubmitting || !artistCreateForm.name?.trim()}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
