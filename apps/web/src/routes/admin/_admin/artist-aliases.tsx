import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ArtistAliasEditDialog } from "@/components/admin/artist-alias-edit-dialog";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import {
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
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
	} = useRowSelection<ArtistAlias>();

	// 一括削除ダイアログ状態
	const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
	const [isBatchDeleting, setIsBatchDeleting] = useState(false);
	const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

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

	const handleDelete = async (alias: ArtistAlias) => {
		if (!confirm(`「${alias.name}」を削除しますか？`)) return;
		try {
			await artistAliasesApi.delete(alias.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handleBatchDelete = async () => {
		setIsBatchDeleting(true);
		setBatchDeleteError(null);

		try {
			const ids = Array.from(selectedItems.values()).map((item) => item.id);

			if (ids.length === 0) {
				setBatchDeleteError("削除可能な名義がありません");
				return;
			}

			const result = await artistAliasesApi.batchDelete(ids);

			if (result.failed.length > 0) {
				setBatchDeleteError(
					`${result.deleted}件削除、${result.failed.length}件失敗`,
				);
			} else {
				setIsBatchDeleteDialogOpen(false);
				clearSelection();
			}

			invalidateQuery();
		} catch (e) {
			setBatchDeleteError(
				e instanceof Error ? e.message : "一括削除に失敗しました",
			);
		} finally {
			setIsBatchDeleting(false);
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
					secondaryActions={
						selectedCount > 0
							? [
									{
										label: `選択中の${selectedCount}件を削除`,
										icon: <Trash2 className="mr-2 h-4 w-4" />,
										onClick: () => setIsBatchDeleteDialogOpen(true),
									},
								]
							: undefined
					}
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
									<TableHead className="w-[50px]">
										<Checkbox
											checked={isAllSelected(aliases)}
											indeterminate={isIndeterminate(aliases)}
											onCheckedChange={() => toggleAll(aliases)}
											aria-label="すべて選択"
										/>
									</TableHead>
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
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											該当する名義が見つかりません
										</TableCell>
									</TableRow>
								) : (
									aliases.map((alias) => (
										<TableRow
											key={alias.id}
											className={
												isSelected(alias.id) ? "bg-primary/5" : undefined
											}
										>
											<TableCell>
												<Checkbox
													checked={isSelected(alias.id)}
													onCheckedChange={() => toggleItem(alias)}
													aria-label={`${alias.name}を選択`}
												/>
											</TableCell>
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
			<ArtistAliasEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<ArtistAliasEditDialog
				open={!!editingAlias}
				onOpenChange={(open) => {
					if (!open) setEditingAlias(null);
				}}
				mode="edit"
				alias={editingAlias}
				onSuccess={invalidateQuery}
			/>

			{/* 一括削除確認ダイアログ */}
			<ConfirmDialog
				open={isBatchDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsBatchDeleteDialogOpen(open);
					if (!open) {
						setBatchDeleteError(null);
					}
				}}
				title="アーティスト名義の一括削除"
				description={
					<div>
						<p>選択した{selectedCount}件の名義を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							この操作は取り消せません。
						</p>
						{batchDeleteError && (
							<p className="mt-2 text-error text-sm">{batchDeleteError}</p>
						)}
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleBatchDelete}
				isLoading={isBatchDeleting}
			/>
		</div>
	);
}
