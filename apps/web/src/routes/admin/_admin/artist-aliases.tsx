import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
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
import { createPageHead } from "@/lib/head";
import { artistAliasesListQueryOptions } from "@/lib/query-options";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/artist-aliases")({
	head: () => createPageHead("アーティスト名義"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			artistAliasesListQueryOptions({
				page: DEFAULT_PAGE,
				limit: DEFAULT_PAGE_SIZE,
			}),
		),
	component: ArtistAliasesPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

// 名義種別に応じたBadgeのvariantを返す
const getAliasTypeBadgeVariant = (
	aliasTypeCode: string | null,
): "primary" | "info" | "accent" | "secondary" => {
	switch (aliasTypeCode) {
		case "main":
			return "primary";
		case "romanization":
			return "info";
		case "pseudonym":
			return "accent";
		default:
			return "secondary";
	}
};

// 文字種に応じたBadgeのvariantを返す
const getInitialScriptBadgeVariant = (
	initialScript: string,
): "primary" | "info" | "accent" | "success" | "warning" | "ghost" => {
	switch (initialScript) {
		case "latin":
			return "primary";
		case "hiragana":
			return "info";
		case "katakana":
			return "accent";
		case "kanji":
			return "success";
		case "numeric":
			return "warning";
		default:
			return "ghost";
	}
};

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "名義名" },
	{ key: "artistName", label: "アーティスト" },
	{ key: "aliasTypeCode", label: "種別" },
	{ key: "initialScript", label: "文字種" },
	{ key: "nameInitial", label: "頭文字" },
	{ key: "period", label: "使用期間" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function ArtistAliasesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [artistIdFilter, setArtistIdFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:artist-aliases",
		columnConfigs,
	);

	const [editingAlias, setEditingAlias] = useState<ArtistAlias | null>(null);
	const [editForm, setEditForm] = useState<Partial<ArtistAlias>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<ArtistAlias>>({
		initialScript: "latin",
		aliasTypeCode: "main",
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

	// 名義種別一覧取得
	const { data: aliasTypesData } = useQuery({
		queryKey: ["aliasTypes", "all"],
		queryFn: () => aliasTypesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});
	const aliasTypes = aliasTypesData?.data ?? [];

	const { data, isPending, error } = useQuery(
		artistAliasesListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			artistId: artistIdFilter || undefined,
		}),
	);

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
			const id = createId.artist();
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
			const id = createId.artistAlias();
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
			setCreateForm({ initialScript: "latin", aliasTypeCode: "main" });
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

	// アーティストオプションを作成（編集中のアーティストを含める）
	const artistFilterOptions = useMemo(() => {
		const options = artists.map((a) => ({
			value: a.id,
			label: a.name,
		}));
		// 編集中の名義のアーティストがリストにない場合は追加
		if (
			editingAlias?.artistId &&
			editingAlias?.artistName &&
			!options.find((o) => o.value === editingAlias.artistId)
		) {
			options.unshift({
				value: editingAlias.artistId,
				label: editingAlias.artistName,
			});
		}
		return options;
	}, [artists, editingAlias?.artistId, editingAlias?.artistName]);

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>アーティスト名義管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">アーティスト名義管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名義名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					columnVisibility={{
						columns: columnConfigs,
						visibleColumns,
						onToggle: toggleColumn,
					}}
					primaryAction={{
						label: "新規作成",
						onClick: () => setIsCreateDialogOpen(true),
					}}
				>
					<SearchableSelect
						value={artistIdFilter}
						onChange={setArtistIdFilter}
						options={artistFilterOptions}
						placeholder="アーティストで絞り込み"
						searchPlaceholder="アーティストを検索..."
						emptyMessage="該当するアーティストがありません"
						className="w-56"
					/>
				</DataTableActionBar>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
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
									{isVisible("name") && <TableHead>名義名</TableHead>}
									{isVisible("artistName") && (
										<TableHead className="w-[180px]">アーティスト</TableHead>
									)}
									{isVisible("aliasTypeCode") && (
										<TableHead className="w-[100px]">種別</TableHead>
									)}
									{isVisible("initialScript") && (
										<TableHead className="w-[80px]">文字種</TableHead>
									)}
									{isVisible("nameInitial") && (
										<TableHead className="w-[70px]">頭文字</TableHead>
									)}
									{isVisible("period") && (
										<TableHead className="w-[140px]">使用期間</TableHead>
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
								{aliases.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											該当する名義が見つかりません
										</TableCell>
									</TableRow>
								) : (
									aliases.map((alias) => (
										<TableRow key={alias.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{alias.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													<Link
														to="/admin/artist-aliases/$id"
														params={{ id: alias.id }}
														className="text-primary hover:underline"
													>
														{alias.name}
													</Link>
												</TableCell>
											)}
											{isVisible("artistName") && (
												<TableCell className="text-base-content/70">
													{alias.artistName || "-"}
												</TableCell>
											)}
											{isVisible("aliasTypeCode") && (
												<TableCell>
													{alias.aliasTypeCode ? (
														<Badge
															variant={getAliasTypeBadgeVariant(
																alias.aliasTypeCode,
															)}
														>
															{aliasTypes.find(
																(t) => t.code === alias.aliasTypeCode,
															)?.label || alias.aliasTypeCode}
														</Badge>
													) : (
														<span className="text-base-content/50">-</span>
													)}
												</TableCell>
											)}
											{isVisible("initialScript") && (
												<TableCell>
													<Badge
														variant={getInitialScriptBadgeVariant(
															alias.initialScript,
														)}
													>
														{INITIAL_SCRIPT_LABELS[
															alias.initialScript as InitialScript
														] || alias.initialScript}
													</Badge>
												</TableCell>
											)}
											{isVisible("nameInitial") && (
												<TableCell className="font-mono">
													{alias.nameInitial || "-"}
												</TableCell>
											)}
											{isVisible("period") && (
												<TableCell className="text-base-content/70 text-sm">
													{alias.periodFrom || alias.periodTo
														? `${alias.periodFrom || "?"} 〜 ${alias.periodTo || "現在"}`
														: "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(alias.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(alias.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/artist-aliases/$id"
														params={{ id: alias.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
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
						setCreateForm({ initialScript: "latin", aliasTypeCode: "main" });
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規アーティスト名義</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								名義名 <span className="text-error">*</span>
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
										initialScript: initial.initialScript as InitialScript,
										nameInitial: initial.nameInitial,
									});
								}}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-artistId">
								アーティスト <span className="text-error">*</span>
							</Label>
							<div className="flex gap-2">
								<SearchableSelect
									value={createForm.artistId || ""}
									onChange={(value) =>
										setCreateForm({ ...createForm, artistId: value })
									}
									options={artistFilterOptions}
									placeholder="アーティストを選択"
									searchPlaceholder="アーティストを検索..."
									emptyMessage="該当するアーティストがありません"
									clearable={false}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="outline"
									className="btn-square"
									onClick={() => setIsArtistCreateDialogOpen(true)}
									title="新規アーティスト作成"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-aliasTypeCode">名義種別</Label>
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
								onChange={(e) => {
									const name = e.target.value;
									const initial = detectInitial(name);
									setArtistCreateForm({
										...artistCreateForm,
										name,
										nameJa: name,
										sortName: name,
										initialScript: initial.initialScript as InitialScript,
										nameInitial: initial.nameInitial,
									});
								}}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsArtistCreateDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleArtistCreate}
							disabled={isSubmitting}
						>
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
						<DialogTitle>アーティスト名義の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								名義名 <span className="text-error">*</span>
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
						<div className="grid gap-2">
							<Label htmlFor="edit-artistId">
								アーティスト <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={editForm.artistId || ""}
								onChange={(value) =>
									setEditForm({ ...editForm, artistId: value })
								}
								options={artistFilterOptions}
								placeholder="アーティストを選択"
								searchPlaceholder="アーティストを検索..."
								emptyMessage="該当するアーティストがありません"
								clearable={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-aliasTypeCode">名義種別</Label>
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
						<Button variant="ghost" onClick={() => setEditingAlias(null)}>
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
