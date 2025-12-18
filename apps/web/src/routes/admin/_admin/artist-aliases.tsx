import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import {
	type Artist,
	type ArtistAlias,
	aliasTypesApi,
	artistAliasesApi,
	artistsApi,
	INITIAL_SCRIPT_LABELS,
	type InitialScript,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/artist-aliases")({
	component: ArtistAliasesPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

function ArtistAliasesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [artistIdFilter, setArtistIdFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	const [editingAlias, setEditingAlias] = useState<ArtistAlias | null>(null);
	const [editForm, setEditForm] = useState<Partial<ArtistAlias>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<ArtistAlias>>({
		initialScript: "latin",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// アーティスト作成用ネストダイアログ
	const [isArtistCreateDialogOpen, setIsArtistCreateDialogOpen] =
		useState(false);
	const [artistCreateForm, setArtistCreateForm] = useState<Partial<Artist>>({
		initialScript: "latin",
	});

	// アーティスト一覧取得（セレクト用）
	const { data: artistsData } = useQuery({
		queryKey: ["artists", "all"],
		queryFn: () => artistsApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});
	const artists = artistsData?.data ?? [];

	// 別名義種別一覧取得
	const { data: aliasTypesData } = useQuery({
		queryKey: ["aliasTypes", "all"],
		queryFn: () => aliasTypesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});
	const aliasTypes = aliasTypesData?.data ?? [];

	const { data, isLoading, error } = useQuery({
		queryKey: [
			"artistAliases",
			page,
			pageSize,
			debouncedSearch,
			artistIdFilter,
		],
		queryFn: () =>
			artistAliasesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				artistId: artistIdFilter || undefined,
			}),
		staleTime: 30_000,
	});

	const aliases = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
	};

	const invalidateArtists = () => {
		queryClient.invalidateQueries({ queryKey: ["artists"] });
	};

	// アーティスト作成（ネストダイアログから）
	const handleArtistCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			const newArtist = await artistsApi.create({
				id,
				name: artistCreateForm.name || "",
				nameJa: artistCreateForm.nameJa || null,
				nameEn: artistCreateForm.nameEn || null,
				sortName: artistCreateForm.sortName || null,
				nameInitial: artistCreateForm.nameInitial || null,
				initialScript:
					(artistCreateForm.initialScript as InitialScript) || "latin",
				notes: artistCreateForm.notes || null,
			});
			// 作成したアーティストを自動選択
			setCreateForm({ ...createForm, artistId: newArtist.id });
			setIsArtistCreateDialogOpen(false);
			setArtistCreateForm({ initialScript: "latin" });
			invalidateArtists();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "アーティスト作成に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			await artistAliasesApi.create({
				id,
				artistId: createForm.artistId || "",
				name: createForm.name || "",
				aliasTypeCode: createForm.aliasTypeCode || null,
				nameInitial: createForm.nameInitial || null,
				initialScript: (createForm.initialScript as InitialScript) || "latin",
				periodFrom: createForm.periodFrom || null,
				periodTo: createForm.periodTo || null,
			});
			setIsCreateDialogOpen(false);
			setCreateForm({ initialScript: "latin" });
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingAlias) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await artistAliasesApi.update(editingAlias.id, {
				artistId: editForm.artistId,
				name: editForm.name,
				aliasTypeCode: editForm.aliasTypeCode,
				nameInitial: editForm.nameInitial,
				initialScript: editForm.initialScript,
				periodFrom: editForm.periodFrom,
				periodTo: editForm.periodTo,
			});
			setEditingAlias(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (alias: ArtistAlias) => {
		if (!confirm(`「${alias.name}」を削除しますか？`)) return;
		try {
			await artistAliasesApi.delete(alias.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	const artistFilterOptions = artists.map((a) => ({
		value: a.id,
		label: a.name,
	}));

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="アーティスト別名義管理"
				breadcrumbs={[{ label: "アーティスト別名義" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="別名義名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={artistFilterOptions}
					filterValue={artistIdFilter}
					filterPlaceholder="アーティストで絞り込み"
					onFilterChange={setArtistIdFilter}
					primaryAction={{
						label: "新規作成",
						onClick: () => setIsCreateDialogOpen(true),
					}}
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isLoading ? (
					<DataTableSkeleton
						rows={5}
						columns={6}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>別名義名</TableHead>
									<TableHead className="w-[180px]">アーティスト</TableHead>
									<TableHead className="w-[120px]">種別</TableHead>
									<TableHead className="w-[100px]">頭文字</TableHead>
									<TableHead className="w-[150px]">使用期間</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{aliases.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-24 text-center text-base-content/50"
										>
											該当する別名義が見つかりません
										</TableCell>
									</TableRow>
								) : (
									aliases.map((alias) => (
										<TableRow key={alias.id}>
											<TableCell className="font-medium">
												{alias.name}
											</TableCell>
											<TableCell className="text-base-content/70">
												{alias.artistName || "-"}
											</TableCell>
											<TableCell>
												{alias.aliasTypeCode ? (
													<Badge variant="secondary">
														{aliasTypes.find(
															(t) => t.code === alias.aliasTypeCode,
														)?.label || alias.aliasTypeCode}
													</Badge>
												) : (
													<span className="text-base-content/50">-</span>
												)}
											</TableCell>
											<TableCell className="font-mono">
												{alias.nameInitial || "-"}
											</TableCell>
											<TableCell className="text-base-content/70 text-sm">
												{alias.periodFrom || alias.periodTo
													? `${alias.periodFrom || "?"} 〜 ${alias.periodTo || "現在"}`
													: "-"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingAlias(alias);
															setEditForm({
																artistId: alias.artistId,
																name: alias.name,
																aliasTypeCode: alias.aliasTypeCode,
																nameInitial: alias.nameInitial,
																initialScript: alias.initialScript,
																periodFrom: alias.periodFrom,
																periodTo: alias.periodTo,
															});
															setMutationError(null);
														}}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(alias)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						<div className="border-base-300 border-t p-4">
							<DataTablePagination
								page={page}
								pageSize={pageSize}
								total={total}
								onPageChange={handlePageChange}
								onPageSizeChange={handlePageSizeChange}
							/>
						</div>
					</>
				)}
			</div>

			{/* 新規作成ダイアログ */}
			<Dialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsCreateDialogOpen(false);
						setCreateForm({ initialScript: "latin" });
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規アーティスト別名義</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-artistId">
								アーティスト <span className="text-error">*</span>
							</Label>
							<div className="flex gap-2">
								<Select
									id="create-artistId"
									className="flex-1"
									value={createForm.artistId || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, artistId: e.target.value })
									}
								>
									<option value="">選択してください</option>
									{artists.map((a) => (
										<option key={a.id} value={a.id}>
											{a.name}
										</option>
									))}
								</Select>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => setIsArtistCreateDialogOpen(true)}
									title="新規アーティスト作成"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								別名義名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-aliasTypeCode">別名義種別</Label>
							<Select
								id="create-aliasTypeCode"
								value={createForm.aliasTypeCode || ""}
								onChange={(e) =>
									setCreateForm({
										...createForm,
										aliasTypeCode: e.target.value || null,
									})
								}
							>
								<option value="">選択してください</option>
								{aliasTypes.map((t) => (
									<option key={t.code} value={t.code}>
										{t.label}
									</option>
								))}
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-initialScript">
									頭文字の文字種 <span className="text-error">*</span>
								</Label>
								<Select
									id="create-initialScript"
									value={createForm.initialScript || "latin"}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											initialScript: e.target.value as InitialScript,
											nameInitial: requiresInitial(e.target.value)
												? createForm.nameInitial
												: null,
										})
									}
								>
									{initialScriptOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-nameInitial">
									頭文字
									{requiresInitial(createForm.initialScript || "latin") && (
										<span className="text-error"> *</span>
									)}
								</Label>
								<Input
									id="create-nameInitial"
									value={createForm.nameInitial || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											nameInitial: e.target.value.slice(0, 1),
										})
									}
									maxLength={1}
									disabled={
										!requiresInitial(createForm.initialScript || "latin")
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-periodFrom">使用開始日</Label>
								<Input
									id="create-periodFrom"
									type="date"
									value={createForm.periodFrom || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											periodFrom: e.target.value || null,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-periodTo">使用終了日</Label>
								<Input
									id="create-periodTo"
									type="date"
									value={createForm.periodTo || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											periodTo: e.target.value || null,
										})
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsCreateDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleCreate} disabled={isSubmitting}>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* アーティスト新規作成ネストダイアログ */}
			<Dialog
				open={isArtistCreateDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsArtistCreateDialogOpen(false);
						setArtistCreateForm({ initialScript: "latin" });
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規アーティスト</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="artist-create-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="artist-create-name"
								value={artistCreateForm.name || ""}
								onChange={(e) =>
									setArtistCreateForm({
										...artistCreateForm,
										name: e.target.value,
									})
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="artist-create-initialScript">
									頭文字の文字種 <span className="text-error">*</span>
								</Label>
								<Select
									id="artist-create-initialScript"
									value={artistCreateForm.initialScript || "latin"}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											initialScript: e.target.value as InitialScript,
											nameInitial: requiresInitial(e.target.value)
												? artistCreateForm.nameInitial
												: null,
										})
									}
								>
									{initialScriptOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="artist-create-nameInitial">
									頭文字
									{requiresInitial(
										artistCreateForm.initialScript || "latin",
									) && <span className="text-error"> *</span>}
								</Label>
								<Input
									id="artist-create-nameInitial"
									value={artistCreateForm.nameInitial || ""}
									onChange={(e) =>
										setArtistCreateForm({
											...artistCreateForm,
											nameInitial: e.target.value.slice(0, 1),
										})
									}
									maxLength={1}
									disabled={
										!requiresInitial(artistCreateForm.initialScript || "latin")
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsArtistCreateDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleArtistCreate} disabled={isSubmitting}>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingAlias}
				onOpenChange={(open) => {
					if (!open) {
						setEditingAlias(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>アーティスト別名義の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-artistId">
								アーティスト <span className="text-error">*</span>
							</Label>
							<Select
								id="edit-artistId"
								value={editForm.artistId || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, artistId: e.target.value })
								}
							>
								<option value="">選択してください</option>
								{artists.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name}
									</option>
								))}
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								別名義名 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-aliasTypeCode">別名義種別</Label>
							<Select
								id="edit-aliasTypeCode"
								value={editForm.aliasTypeCode || ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										aliasTypeCode: e.target.value || null,
									})
								}
							>
								<option value="">選択してください</option>
								{aliasTypes.map((t) => (
									<option key={t.code} value={t.code}>
										{t.label}
									</option>
								))}
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-initialScript">
									頭文字の文字種 <span className="text-error">*</span>
								</Label>
								<Select
									id="edit-initialScript"
									value={editForm.initialScript || "latin"}
									onChange={(e) =>
										setEditForm({
											...editForm,
											initialScript: e.target.value as InitialScript,
											nameInitial: requiresInitial(e.target.value)
												? editForm.nameInitial
												: null,
										})
									}
								>
									{initialScriptOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-nameInitial">
									頭文字
									{requiresInitial(editForm.initialScript || "latin") && (
										<span className="text-error"> *</span>
									)}
								</Label>
								<Input
									id="edit-nameInitial"
									value={editForm.nameInitial || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											nameInitial: e.target.value.slice(0, 1),
										})
									}
									maxLength={1}
									disabled={!requiresInitial(editForm.initialScript || "latin")}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-periodFrom">使用開始日</Label>
								<Input
									id="edit-periodFrom"
									type="date"
									value={editForm.periodFrom || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											periodFrom: e.target.value || null,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-periodTo">使用終了日</Label>
								<Input
									id="edit-periodTo"
									type="date"
									value={editForm.periodTo || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											periodTo: e.target.value || null,
										})
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingAlias(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate} disabled={isSubmitting}>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
