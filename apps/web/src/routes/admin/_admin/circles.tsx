import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import {
	type Circle,
	type CircleLink,
	type CircleWithLinks,
	circleLinksApi,
	circlesApi,
	INITIAL_SCRIPT_LABELS,
	type InitialScript,
	platformsApi,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/circles")({
	component: CirclesPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

function CirclesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [initialScript, setInitialScript] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	const [editingCircle, setEditingCircle] = useState<CircleWithLinks | null>(
		null,
	);
	const [editForm, setEditForm] = useState<Partial<Circle>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<Circle>>({
		initialScript: "latin",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// リンク編集用
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [editingLink, setEditingLink] = useState<CircleLink | null>(null);
	const [linkForm, setLinkForm] = useState<Partial<CircleLink>>({
		isOfficial: true,
		isPrimary: false,
	});

	// プラットフォーム一覧取得
	const { data: platformsData } = useQuery({
		queryKey: ["platforms", "all"],
		queryFn: () => platformsApi.list({ limit: 100 }),
		staleTime: 60_000,
	});
	const platforms = platformsData?.data ?? [];

	const { data, isLoading, error } = useQuery({
		queryKey: ["circles", page, pageSize, debouncedSearch, initialScript],
		queryFn: () =>
			circlesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				initialScript: initialScript || undefined,
			}),
		staleTime: 30_000,
	});

	const circles = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["circles"] });
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			await circlesApi.create({
				id,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				nameInitial: createForm.nameInitial || null,
				initialScript: (createForm.initialScript as InitialScript) || "latin",
				notes: createForm.notes || null,
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
		if (!editingCircle) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await circlesApi.update(editingCircle.id, {
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				nameInitial: editForm.nameInitial,
				initialScript: editForm.initialScript,
				notes: editForm.notes,
			});
			// 編集中のサークル情報を更新
			const updated = await circlesApi.get(editingCircle.id);
			setEditingCircle(updated);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (circle: Circle) => {
		if (
			!confirm(
				`「${circle.name}」を削除しますか？\n※関連する外部リンクも削除されます。`,
			)
		)
			return;
		try {
			await circlesApi.delete(circle.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	// サークルを編集モードで開く（詳細取得）
	const handleEdit = async (circle: Circle) => {
		try {
			const circleWithLinks = await circlesApi.get(circle.id);
			setEditingCircle(circleWithLinks);
			setEditForm({
				name: circleWithLinks.name,
				nameJa: circleWithLinks.nameJa,
				nameEn: circleWithLinks.nameEn,
				nameInitial: circleWithLinks.nameInitial,
				initialScript: circleWithLinks.initialScript,
				notes: circleWithLinks.notes,
			});
			setMutationError(null);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "サークル情報の取得に失敗しました",
			);
		}
	};

	// リンク追加ダイアログを開く
	const handleOpenAddLinkDialog = () => {
		setEditingLink(null);
		setLinkForm({
			platformCode: "",
			url: "",
			platformId: null,
			handle: null,
			isOfficial: true,
			isPrimary: false,
		});
		setIsLinkDialogOpen(true);
	};

	// リンク編集ダイアログを開く
	const handleOpenEditLinkDialog = (link: CircleLink) => {
		setEditingLink(link);
		setLinkForm({
			platformCode: link.platformCode,
			url: link.url,
			platformId: link.platformId,
			handle: link.handle,
			isOfficial: link.isOfficial,
			isPrimary: link.isPrimary,
		});
		setIsLinkDialogOpen(true);
	};

	// リンク保存
	const handleSaveLink = async () => {
		if (!editingCircle) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingLink) {
				// 更新
				await circleLinksApi.update(editingCircle.id, editingLink.id, {
					platformCode: linkForm.platformCode,
					url: linkForm.url,
					platformId: linkForm.platformId,
					handle: linkForm.handle,
					isOfficial: linkForm.isOfficial,
					isPrimary: linkForm.isPrimary,
				});
			} else {
				// 新規作成
				const id = nanoid();
				await circleLinksApi.create(editingCircle.id, {
					id,
					platformCode: linkForm.platformCode || "",
					url: linkForm.url || "",
					platformId: linkForm.platformId || null,
					handle: linkForm.handle || null,
					isOfficial: linkForm.isOfficial ?? true,
					isPrimary: linkForm.isPrimary ?? false,
				});
			}
			setIsLinkDialogOpen(false);
			// サークル詳細を再取得
			const updated = await circlesApi.get(editingCircle.id);
			setEditingCircle(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "リンクの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// リンク削除
	const handleDeleteLink = async (link: CircleLink) => {
		if (!editingCircle) return;
		if (!confirm("このリンクを削除しますか？")) return;
		try {
			await circleLinksApi.delete(editingCircle.id, link.id);
			const updated = await circlesApi.get(editingCircle.id);
			setEditingCircle(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "リンクの削除に失敗しました",
			);
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

	const handleInitialScriptChange = (value: string) => {
		setInitialScript(value);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="サークル管理"
				breadcrumbs={[{ label: "サークル" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={initialScriptOptions}
					filterValue={initialScript}
					filterPlaceholder="頭文字の文字種"
					onFilterChange={handleInitialScriptChange}
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
									<TableHead>名前</TableHead>
									<TableHead className="w-[150px]">日本語名</TableHead>
									<TableHead className="w-[150px]">英語名</TableHead>
									<TableHead className="w-[100px]">頭文字</TableHead>
									<TableHead className="w-[120px]">文字種</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{circles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-24 text-center text-base-content/50"
										>
											該当するサークルが見つかりません
										</TableCell>
									</TableRow>
								) : (
									circles.map((circle) => (
										<TableRow key={circle.id}>
											<TableCell className="font-medium">
												{circle.name}
											</TableCell>
											<TableCell className="text-base-content/70">
												{circle.nameJa || "-"}
											</TableCell>
											<TableCell className="text-base-content/70">
												{circle.nameEn || "-"}
											</TableCell>
											<TableCell className="font-mono">
												{circle.nameInitial || "-"}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{INITIAL_SCRIPT_LABELS[circle.initialScript]}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(circle)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(circle)}
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
						<DialogTitle>新規サークル</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-nameJa">日本語名</Label>
								<Input
									id="create-nameJa"
									value={createForm.nameJa || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameJa: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-nameEn">英語名</Label>
								<Input
									id="create-nameEn"
									value={createForm.nameEn || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameEn: e.target.value })
									}
								/>
							</div>
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
						<div className="grid gap-2">
							<Label htmlFor="create-notes">備考</Label>
							<Textarea
								id="create-notes"
								value={createForm.notes || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, notes: e.target.value })
								}
								rows={3}
							/>
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

			{/* 編集ダイアログ（リンク管理含む） */}
			<Dialog
				open={!!editingCircle}
				onOpenChange={(open) => {
					if (!open) {
						setEditingCircle(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>サークルの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-nameJa">日本語名</Label>
								<Input
									id="edit-nameJa"
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-nameEn">英語名</Label>
								<Input
									id="edit-nameEn"
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
								/>
							</div>
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
						<div className="grid gap-2">
							<Label htmlFor="edit-notes">備考</Label>
							<Textarea
								id="edit-notes"
								value={editForm.notes || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, notes: e.target.value })
								}
								rows={2}
							/>
						</div>

						{/* 外部リンク一覧 */}
						<div className="mt-2 border-base-300 border-t pt-4">
							<div className="mb-2 flex items-center justify-between">
								<Label className="flex items-center gap-2">
									<Link2 className="h-4 w-4" />
									外部リンク
								</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleOpenAddLinkDialog}
								>
									<Plus className="mr-1 h-4 w-4" />
									追加
								</Button>
							</div>
							{editingCircle?.links && editingCircle.links.length > 0 ? (
								<div className="space-y-2">
									{editingCircle.links.map((link) => (
										<div
											key={link.id}
											className="flex items-center justify-between rounded border border-base-300 p-2"
										>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">
													{link.platformName || link.platformCode}
												</Badge>
												<a
													href={link.url}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-1 text-primary text-sm hover:underline"
												>
													{link.url.length > 40
														? `${link.url.slice(0, 40)}...`
														: link.url}
													<ExternalLink className="h-3 w-3" />
												</a>
												{link.isPrimary && (
													<Badge className="bg-primary text-primary-content">
														代表
													</Badge>
												)}
												{link.isOfficial && (
													<Badge variant="outline">公式</Badge>
												)}
											</div>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleOpenEditLinkDialog(link)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-error hover:text-error"
													onClick={() => handleDeleteLink(link)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-base-content/50 text-sm">
									外部リンクがありません
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingCircle(null)}>
							閉じる
						</Button>
						<Button onClick={handleUpdate} disabled={isSubmitting}>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* リンク追加・編集ダイアログ */}
			<Dialog
				open={isLinkDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsLinkDialogOpen(false);
						setEditingLink(null);
						setLinkForm({
							isOfficial: true,
							isPrimary: false,
						});
					}
				}}
			>
				<DialogContent className="sm:max-w-[450px]">
					<DialogHeader>
						<DialogTitle>
							{editingLink ? "外部リンクの編集" : "外部リンクの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="link-platformCode">
								プラットフォーム <span className="text-error">*</span>
							</Label>
							<Select
								id="link-platformCode"
								value={linkForm.platformCode || ""}
								onChange={(e) =>
									setLinkForm({ ...linkForm, platformCode: e.target.value })
								}
							>
								<option value="">選択してください</option>
								{platforms.map((p) => (
									<option key={p.code} value={p.code}>
										{p.name}
									</option>
								))}
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="link-url">
								URL <span className="text-error">*</span>
							</Label>
							<Input
								id="link-url"
								type="url"
								value={linkForm.url || ""}
								onChange={(e) =>
									setLinkForm({ ...linkForm, url: e.target.value })
								}
								placeholder="https://..."
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="link-platformId">プラットフォーム内ID</Label>
								<Input
									id="link-platformId"
									value={linkForm.platformId || ""}
									onChange={(e) =>
										setLinkForm({
											...linkForm,
											platformId: e.target.value || null,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="link-handle">ハンドル</Label>
								<Input
									id="link-handle"
									value={linkForm.handle || ""}
									onChange={(e) =>
										setLinkForm({
											...linkForm,
											handle: e.target.value || null,
										})
									}
									placeholder="@example"
								/>
							</div>
						</div>
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<Checkbox
									id="link-isOfficial"
									checked={linkForm.isOfficial ?? true}
									onCheckedChange={(checked) =>
										setLinkForm({ ...linkForm, isOfficial: !!checked })
									}
								/>
								<Label htmlFor="link-isOfficial" className="cursor-pointer">
									公式リンク
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id="link-isPrimary"
									checked={linkForm.isPrimary ?? false}
									onCheckedChange={(checked) =>
										setLinkForm({ ...linkForm, isPrimary: !!checked })
									}
								/>
								<Label htmlFor="link-isPrimary" className="cursor-pointer">
									代表リンク
								</Label>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsLinkDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleSaveLink} disabled={isSubmitting}>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
