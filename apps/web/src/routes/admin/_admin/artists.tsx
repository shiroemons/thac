import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db/utils/id";
import { detectInitial } from "@thac/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
import {
	type Artist,
	artistsApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
	type InitialScript,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/artists")({
	head: () => createPageHead("アーティスト"),
	component: ArtistsPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

// 頭文字が必須かどうか判定
const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "名前" },
	{ key: "nameJa", label: "日本語名" },
	{ key: "nameEn", label: "英語名" },
	{ key: "sortName", label: "ソート用名" },
	{ key: "initialScript", label: "文字種" },
	{ key: "nameInitial", label: "頭文字" },
	{ key: "notes", label: "備考" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function ArtistsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [initialScript, setInitialScript] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:artists",
		columnConfigs,
	);

	const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
	const [editForm, setEditForm] = useState<Partial<Artist>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<Artist>>({
		initialScript: "latin",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["artists", page, pageSize, debouncedSearch, initialScript],
		queryFn: () =>
			artistsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				initialScript: initialScript || undefined,
			}),
		staleTime: 30_000,
	});

	const artists = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artists"] });
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = createId.artist();
			await artistsApi.create({
				id,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				sortName: createForm.sortName || null,
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
		if (!editingArtist) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await artistsApi.update(editingArtist.id, {
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				sortName: editForm.sortName,
				nameInitial: editForm.nameInitial,
				initialScript: editForm.initialScript,
				notes: editForm.notes,
			});
			setEditingArtist(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (artist: Artist) => {
		if (
			!confirm(
				`「${artist.name}」を削除しますか？\n※関連する別名義も削除されます。`,
			)
		)
			return;
		try {
			await artistsApi.delete(artist.id);
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

	const handleInitialScriptChange = (value: string) => {
		setInitialScript(value);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="アーティスト管理"
				breadcrumbs={[{ label: "アーティスト" }]}
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
					columnVisibility={{
						columns: columnConfigs,
						visibleColumns,
						onToggle: toggleColumn,
					}}
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
									{isVisible("id") && (
										<TableHead className="w-[220px]">ID</TableHead>
									)}
									{isVisible("name") && <TableHead>名前</TableHead>}
									{isVisible("nameJa") && (
										<TableHead className="w-[150px]">日本語名</TableHead>
									)}
									{isVisible("nameEn") && (
										<TableHead className="w-[150px]">英語名</TableHead>
									)}
									{isVisible("sortName") && (
										<TableHead className="w-[150px]">ソート用名</TableHead>
									)}
									{isVisible("initialScript") && (
										<TableHead className="w-[120px]">文字種</TableHead>
									)}
									{isVisible("nameInitial") && (
										<TableHead className="w-[120px]">頭文字</TableHead>
									)}
									{isVisible("notes") && (
										<TableHead className="w-[200px]">備考</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead className="w-[160px]">作成日時</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead className="w-[160px]">更新日時</TableHead>
									)}
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{artists.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											該当するアーティストが見つかりません
										</TableCell>
									</TableRow>
								) : (
									artists.map((artist) => (
										<TableRow key={artist.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{artist.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													{artist.name}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="text-base-content/70">
													{artist.nameJa || "-"}
												</TableCell>
											)}
											{isVisible("nameEn") && (
												<TableCell className="text-base-content/70">
													{artist.nameEn || "-"}
												</TableCell>
											)}
											{isVisible("sortName") && (
												<TableCell className="text-base-content/70">
													{artist.sortName || "-"}
												</TableCell>
											)}
											{isVisible("initialScript") && (
												<TableCell>
													<Badge
														variant={
															INITIAL_SCRIPT_BADGE_VARIANTS[
																artist.initialScript
															]
														}
													>
														{INITIAL_SCRIPT_LABELS[artist.initialScript]}
													</Badge>
												</TableCell>
											)}
											{isVisible("nameInitial") && (
												<TableCell className="font-mono">
													{artist.nameInitial || "-"}
												</TableCell>
											)}
											{isVisible("notes") && (
												<TableCell className="max-w-[200px] truncate text-base-content/70">
													{artist.notes || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(artist.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(artist.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/artists/$id"
														params={{ id: artist.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingArtist(artist);
															setEditForm({
																name: artist.name,
																nameJa: artist.nameJa,
																nameEn: artist.nameEn,
																sortName: artist.sortName,
																nameInitial: artist.nameInitial,
																initialScript: artist.initialScript,
																notes: artist.notes,
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
														onClick={() => handleDelete(artist)}
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
						<DialogTitle>新規アーティスト</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) => {
									const name = e.target.value;
									const initial = detectInitial(name);
									setCreateForm({
										...createForm,
										name,
										nameJa: name,
										sortName: name,
										initialScript: initial.initialScript as InitialScript,
										nameInitial: initial.nameInitial,
									});
								}}
								placeholder="例: ZUN"
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
						<div className="grid gap-2">
							<Label htmlFor="create-sortName">ソート用名</Label>
							<Input
								id="create-sortName"
								value={createForm.sortName || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, sortName: e.target.value })
								}
							/>
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
							variant="ghost"
							onClick={() => setIsCreateDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreate}
							disabled={isSubmitting}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingArtist}
				onOpenChange={(open) => {
					if (!open) {
						setEditingArtist(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>アーティストの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) => {
									const name = e.target.value;
									const initial = detectInitial(name);
									setEditForm({
										...editForm,
										name,
										initialScript: initial.initialScript as InitialScript,
										nameInitial: initial.nameInitial,
									});
								}}
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
						<div className="grid gap-2">
							<Label htmlFor="edit-sortName">ソート用名</Label>
							<Input
								id="edit-sortName"
								value={editForm.sortName || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, sortName: e.target.value })
								}
							/>
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
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingArtist(null)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleUpdate}
							disabled={isSubmitting}
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
