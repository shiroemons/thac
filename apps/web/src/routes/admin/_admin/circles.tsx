import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { detectInitial } from "@thac/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	Download,
	ExternalLink,
	Eye,
	Home,
	Link2,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CircleEditDialog } from "@/components/admin/circle-edit-dialog";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { SortIcon } from "@/components/admin/sort-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableGroupedSelect } from "@/components/ui/searchable-grouped-select";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import { useSortableTable } from "@/hooks/use-sortable-table";
import {
	type Circle,
	type CircleLink,
	type CircleWithLinks,
	circlesApi,
	type ExportFormat,
	exportApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
	type InitialScript,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { circleLinkMutations, circleMutations } from "@/lib/mutation-options";
import {
	circlesInfiniteQueryOptions,
	platformGroupedOptionsQueryOptions,
	platformsListQueryOptions,
} from "@/lib/query-options";
import { getErrorMessage, getExternalLinkUrl } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/circles")({
	head: () => createPageHead("サークル"),
	component: CirclesPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "名前" },
	{ key: "nameJa", label: "日本語名" },
	{ key: "nameEn", label: "英語名" },
	{ key: "sortName", label: "ソート用名", defaultVisible: false },
	{ key: "initialScript", label: "文字種" },
	{ key: "nameInitial", label: "頭文字" },
	{ key: "notes", label: "備考", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function CirclesPage() {
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const [initialScript, setInitialScript] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "name",
		defaultSortOrder: "asc",
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:circles",
		columnConfigs,
	);

	const [editingCircle, setEditingCircle] = useState<CircleWithLinks | null>(
		null,
	);
	const [editForm, setEditForm] = useState<Partial<Circle>>({});
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// リンク編集用
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [editingLink, setEditingLink] = useState<CircleLink | null>(null);
	const [linkForm, setLinkForm] = useState<Partial<CircleLink>>({
		isOfficial: true,
		isPrimary: false,
	});

	// 選択状態管理
	const {
		selectedItems,
		isSelected,
		isAllSelected,
		isIndeterminate,
		toggleItem,
		toggleAll,
		clearSelection,
		selectedCount,
	} = useRowSelection<Circle>();

	// 一括削除ダイアログ状態
	const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<Circle | null>(null);

	// リンク削除ダイアログ状態
	const [deleteLinkTarget, setDeleteLinkTarget] = useState<CircleLink | null>(
		null,
	);

	// エクスポート状態
	const [isExporting, setIsExporting] = useState(false);

	// useMutation hooks
	const deleteMutation = useMutation(circleMutations.delete(queryClient));
	const batchDeleteMutation = useMutation(
		circleMutations.batchDelete(queryClient),
	);
	const updateMutation = useMutation(circleMutations.update(queryClient));
	const createLinkMutation = useMutation(
		circleLinkMutations.create(queryClient),
	);
	const updateLinkMutation = useMutation(
		circleLinkMutations.update(queryClient),
	);
	const deleteLinkMutation = useMutation(
		circleLinkMutations.delete(queryClient),
	);

	// ローディング状態とエラー状態
	const isSubmitting =
		updateMutation.isPending ||
		createLinkMutation.isPending ||
		updateLinkMutation.isPending;
	const mutationError =
		deleteMutation.error ||
		batchDeleteMutation.error ||
		updateMutation.error ||
		createLinkMutation.error ||
		updateLinkMutation.error ||
		deleteLinkMutation.error;

	// プラットフォーム一覧取得（生データ：URLパターンマッチに使用）
	const { data: platformsData } = useQuery(
		platformsListQueryOptions({ limit: 100 }),
	);
	const platforms = platformsData?.data ?? [];

	// プラットフォームをカテゴリでグルーピング（selectで変換済み）
	const { data: groupedPlatforms = [] } = useQuery(
		platformGroupedOptionsQueryOptions(),
	);

	// URLからプラットフォームを推測する関数
	const detectPlatformFromUrl = (url: string): string => {
		if (!url || platforms.length === 0) return "";

		// web_siteとblogは汎用パターンなのでスキップし、フォールバックとして扱う
		const genericPlatforms = ["web_site", "blog"];

		for (const platform of platforms) {
			// 汎用プラットフォームはスキップ
			if (genericPlatforms.includes(platform.code)) continue;

			if (platform.urlPattern) {
				try {
					const regex = new RegExp(platform.urlPattern);
					if (regex.test(url)) {
						return platform.code;
					}
				} catch {
					// 無効な正規表現パターンはスキップ
				}
			}
		}
		return "web_site"; // マッチしなければweb_site
	};

	const {
		data,
		isPending,
		isFetching,
		isFetchingNextPage,
		error,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery(
		circlesInfiniteQueryOptions({
			limit: DEFAULT_PAGE_SIZE,
			search: debouncedSearch || undefined,
			initialScript: initialScript || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const circles = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	const handleExport = async (
		format: ExportFormat,
		includeRelations: boolean,
	) => {
		setIsExporting(true);
		try {
			await exportApi.circles({
				format,
				includeRelations,
				search: debouncedSearch || undefined,
				initialScript: initialScript || undefined,
			});
		} finally {
			setIsExporting(false);
		}
	};

	const handleUpdate = () => {
		if (!editingCircle) return;
		updateMutation.mutate(
			{
				id: editingCircle.id,
				data: {
					name: editForm.name,
					nameJa: editForm.nameJa,
					nameEn: editForm.nameEn,
					sortName: editForm.sortName,
					nameInitial: editForm.nameInitial,
					initialScript: editForm.initialScript,
					notes: editForm.notes,
				},
			},
			{
				onSuccess: async () => {
					// 編集中のサークル情報を更新
					const updated = await circlesApi.get(editingCircle.id);
					setEditingCircle(updated);
				},
			},
		);
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		deleteMutation.mutate(deleteTarget.id, {
			onSuccess: () => {
				setDeleteTarget(null);
			},
		});
	};

	const handleBatchDelete = () => {
		const ids = Array.from(selectedItems.values()).map((item) => item.id);

		if (ids.length === 0) {
			return;
		}

		batchDeleteMutation.mutate(ids, {
			onSuccess: (result) => {
				if (result.failed.length === 0) {
					setIsBatchDeleteDialogOpen(false);
					clearSelection();
				}
			},
		});
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
				sortName: circleWithLinks.sortName,
				nameInitial: circleWithLinks.nameInitial,
				initialScript: circleWithLinks.initialScript,
				notes: circleWithLinks.notes,
			});
			// ミューテーションエラーをリセット
			updateMutation.reset();
			createLinkMutation.reset();
			updateLinkMutation.reset();
			deleteLinkMutation.reset();
		} catch {
			// サークル情報の取得に失敗した場合はそのまま表示しない
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
	const handleSaveLink = () => {
		if (!editingCircle) return;

		const onSuccess = async () => {
			setIsLinkDialogOpen(false);
			// サークル詳細を再取得
			const updated = await circlesApi.get(editingCircle.id);
			setEditingCircle(updated);
		};

		if (editingLink) {
			// 更新
			updateLinkMutation.mutate(
				{
					circleId: editingCircle.id,
					linkId: editingLink.id,
					data: {
						platformCode: linkForm.platformCode,
						url: linkForm.url,
						platformId: linkForm.platformId,
						handle: linkForm.handle,
						isOfficial: linkForm.isOfficial,
						isPrimary: linkForm.isPrimary,
					},
				},
				{ onSuccess },
			);
		} else {
			// 新規作成
			const id = createId.circleLink();
			createLinkMutation.mutate(
				{
					circleId: editingCircle.id,
					data: {
						id,
						platformCode: linkForm.platformCode || "",
						url: linkForm.url || "",
						platformId: linkForm.platformId || null,
						handle: linkForm.handle || null,
						isOfficial: linkForm.isOfficial ?? true,
						isPrimary: linkForm.isPrimary ?? false,
					},
				},
				{ onSuccess },
			);
		}
	};

	// リンク削除
	const handleDeleteLink = () => {
		if (!editingCircle || !deleteLinkTarget) return;
		deleteLinkMutation.mutate(
			{
				circleId: editingCircle.id,
				linkId: deleteLinkTarget.id,
			},
			{
				onSuccess: async () => {
					const updated = await circlesApi.get(editingCircle.id);
					setEditingCircle(updated);
					setDeleteLinkTarget(null);
				},
			},
		);
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	const handleInitialScriptChange = (value: string) => {
		setInitialScript(value);
	};

	const displayError =
		(mutationError instanceof Error ? mutationError.message : null) ||
		(error instanceof Error ? error.message : null);

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
					<li>サークル管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">サークル管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					isLoading={isFetching}
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
					secondaryActions={[
						...(selectedCount > 0
							? [
									{
										label: `選択中の${selectedCount}件を削除`,
										icon: <Trash2 className="mr-2 h-4 w-4" />,
										onClick: () => setIsBatchDeleteDialogOpen(true),
									},
								]
							: []),
						{
							label: "TSVでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", false),
							disabled: isExporting,
						},
						{
							label: "JSONでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", false),
							disabled: isExporting,
						},
						{
							label: "TSV（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", true),
							disabled: isExporting,
						},
						{
							label: "JSON（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", true),
							disabled: isExporting,
						},
					]}
				>
					{selectedCount > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-base-content/70 text-sm">
								{selectedCount}件選択中
							</span>
							<Button variant="ghost" size="sm" onClick={clearSelection}>
								選択解除
							</Button>
						</div>
					)}
				</DataTableActionBar>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-4 text-error text-sm">
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
									<TableHead className="w-[50px]">
										<Checkbox
											id="select-all-circles"
											checked={isAllSelected(circles)}
											indeterminate={isIndeterminate(circles)}
											onCheckedChange={() => toggleAll(circles)}
											aria-label="すべて選択"
										/>
									</TableHead>
									{isVisible("id") && (
										<TableHead
											className="w-[220px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("id")}
										>
											ID
											<SortIcon
												column="id"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("name") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("name")}
										>
											名前
											<SortIcon
												column="name"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("nameJa") && (
										<TableHead
											className="w-[150px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("nameJa")}
										>
											日本語名
											<SortIcon
												column="nameJa"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("nameEn") && (
										<TableHead className="w-[150px]">英語名</TableHead>
									)}
									{isVisible("sortName") && (
										<TableHead className="w-[150px]">ソート用名</TableHead>
									)}
									{isVisible("initialScript") && (
										<TableHead className="w-[100px]">文字種</TableHead>
									)}
									{isVisible("nameInitial") && (
										<TableHead className="w-[120px]">頭文字</TableHead>
									)}
									{isVisible("notes") && (
										<TableHead className="w-[200px]">備考</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("createdAt")}
										>
											作成日時
											<SortIcon
												column="createdAt"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("updatedAt")}
										>
											更新日時
											<SortIcon
												column="updatedAt"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{circles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											該当するサークルが見つかりません
										</TableCell>
									</TableRow>
								) : (
									circles.map((circle) => (
										<TableRow
											key={circle.id}
											className={
												isSelected(circle.id) ? "bg-primary/5" : undefined
											}
										>
											<TableCell>
												<Checkbox
													id={`select-circle-${circle.id}`}
													checked={isSelected(circle.id)}
													onCheckedChange={() => toggleItem(circle)}
													aria-label={`${circle.name}を選択`}
												/>
											</TableCell>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-sm">
													{circle.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													{circle.name}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="text-base-content/70">
													{circle.nameJa || "-"}
												</TableCell>
											)}
											{isVisible("nameEn") && (
												<TableCell className="text-base-content/70">
													{circle.nameEn || "-"}
												</TableCell>
											)}
											{isVisible("sortName") && (
												<TableCell className="text-base-content/70">
													{circle.sortName || "-"}
												</TableCell>
											)}
											{isVisible("initialScript") && (
												<TableCell>
													<Badge
														variant={
															INITIAL_SCRIPT_BADGE_VARIANTS[
																circle.initialScript
															]
														}
													>
														{INITIAL_SCRIPT_LABELS[circle.initialScript]}
													</Badge>
												</TableCell>
											)}
											{isVisible("nameInitial") && (
												<TableCell className="font-mono">
													{circle.nameInitial || "-"}
												</TableCell>
											)}
											{isVisible("notes") && (
												<TableCell className="max-w-[200px] truncate text-base-content/70">
													{circle.notes || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(circle.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(circle.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/circles/$id"
														params={{ id: circle.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
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
														onClick={() => setDeleteTarget(circle)}
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
							<InfiniteScroll
								onLoadMore={() => fetchNextPage()}
								isLoading={isFetchingNextPage}
								hasMore={hasNextPage ?? false}
								loadedCount={circles.length}
								totalCount={total}
							/>
						</div>
					</>
				)}
			</div>

			{/* 新規作成ダイアログ */}
			<CircleEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
			/>

			{/* 編集ダイアログ（リンク管理含む） */}
			<Dialog
				open={!!editingCircle}
				onOpenChange={(open) => {
					if (!open) {
						setEditingCircle(null);
						updateMutation.reset();
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
								placeholder="例: 上海アリス幻樂団"
							/>
						</div>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-nameJa">日本語名</Label>
								<Input
									id="edit-nameJa"
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 上海アリス幻樂団"
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
									placeholder="例: Team Shanghai Alice"
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
								placeholder="例: 上海アリス幻樂団"
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
								placeholder="例: 来歴、特記事項など"
								rows={2}
							/>
						</div>

						{/* 外部リンク一覧 */}
						<div className="mt-2 border-base-300 border-t pt-4">
							<div className="mb-2 flex items-center justify-between">
								<span className="flex items-center gap-2 font-medium text-sm">
									<Link2 className="h-4 w-4" />
									外部リンク
								</span>
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
													href={getExternalLinkUrl(link.url)}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-1 text-primary text-sm hover:underline"
												>
													{link.url.length > 40
														? `${link.url.slice(0, 40)}...`
														: link.url}
													<ExternalLink className="h-4 w-4" />
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
													onClick={() => setDeleteLinkTarget(link)}
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
						<Button variant="ghost" onClick={() => setEditingCircle(null)}>
							閉じる
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
						createLinkMutation.reset();
						updateLinkMutation.reset();
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
							<Label htmlFor="link-url">
								URL <span className="text-error">*</span>
							</Label>
							<Input
								id="link-url"
								type="url"
								value={linkForm.url || ""}
								onChange={(e) => {
									const url = e.target.value;
									setLinkForm({ ...linkForm, url });
								}}
								onBlur={(e) => {
									// URLからプラットフォームを自動検出（未選択の場合のみ）
									if (!linkForm.platformCode) {
										const detectedPlatform = detectPlatformFromUrl(
											e.target.value,
										);
										setLinkForm((prev) => ({
											...prev,
											platformCode: detectedPlatform,
										}));
									}
								}}
								placeholder="https://..."
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="link-platformCode">
								プラットフォーム <span className="text-error">*</span>
							</Label>
							<SearchableGroupedSelect
								id="link-platformCode"
								value={linkForm.platformCode || ""}
								onChange={(value) =>
									setLinkForm({ ...linkForm, platformCode: value })
								}
								groups={groupedPlatforms}
								placeholder="選択してください"
								searchPlaceholder="プラットフォームを検索..."
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
						{createLinkMutation.error || updateLinkMutation.error ? (
							<div className="rounded-md bg-error/10 p-4 text-error text-sm">
								{getErrorMessage(
									createLinkMutation.error || updateLinkMutation.error,
								)}
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveLink}
							disabled={
								createLinkMutation.isPending || updateLinkMutation.isPending
							}
						>
							{createLinkMutation.isPending || updateLinkMutation.isPending
								? "保存中..."
								: "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 一括削除確認ダイアログ */}
			<ConfirmDialog
				open={isBatchDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsBatchDeleteDialogOpen(open);
					if (!open) {
						batchDeleteMutation.reset();
					}
				}}
				title="サークルの一括削除"
				description={
					<div>
						<p>選択した{selectedCount}件のサークルを削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する外部リンクも削除されます。この操作は取り消せません。
						</p>
						{batchDeleteMutation.error && (
							<p className="mt-2 text-error text-sm">
								{getErrorMessage(batchDeleteMutation.error)}
							</p>
						)}
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleBatchDelete}
				isLoading={batchDeleteMutation.isPending}
			/>

			{/* 個別削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						deleteMutation.reset();
					}
				}}
				title="サークルの削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する外部リンクも削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>

			{/* リンク削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteLinkTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteLinkTarget(null);
						deleteLinkMutation.reset();
					}
				}}
				title="リンクの削除"
				description="このリンクを削除しますか？この操作は取り消せません。"
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDeleteLink}
				isLoading={deleteLinkMutation.isPending}
			/>
		</div>
	);
}
