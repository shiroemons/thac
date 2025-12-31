import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { OfficialSongEditDialog } from "@/components/admin/official-song-edit-dialog";
import { SortIcon } from "@/components/admin/sort-icon";
import { ImportDialog } from "@/components/import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableGroupedSelect } from "@/components/ui/searchable-grouped-select";
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
import { useSortableTable } from "@/hooks/use-sortable-table";
import {
	importApi,
	type OfficialSong,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { officialSongsListQueryOptions } from "@/lib/query-options";

// 初期表示用のデフォルト値
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/official/songs")({
	head: () => createPageHead("公式楽曲"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			officialSongsListQueryOptions({
				page: DEFAULT_PAGE,
				limit: DEFAULT_PAGE_SIZE,
			}),
		),
	component: OfficialSongsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "楽曲名" },
	{ key: "workName", label: "作品" },
	{ key: "trackNumber", label: "トラック", defaultVisible: false },
	{ key: "composerName", label: "作曲者", defaultVisible: false },
	{ key: "arrangerName", label: "編曲者", defaultVisible: false },
	{ key: "isOriginal", label: "オリジナル" },
	{ key: "sourceSongName", label: "原曲", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function OfficialSongsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [workId, setWorkId] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// ソート状態
	const { sortBy, sortOrder, handleSort, resetSort } = useSortableTable({
		defaultSortBy: "id",
		defaultSortOrder: "asc",
		onSortChange: () => setPage(1),
	});

	// 楽曲名用の3段階ソートハンドラー（昇順→降順→リセット）
	const handleNameJaSort = () => {
		if (sortBy !== "nameJa") {
			// 他のカラム → nameJa昇順
			handleSort("nameJa");
		} else if (sortOrder === "asc") {
			// nameJa昇順 → nameJa降順
			handleSort("nameJa");
		} else {
			// nameJa降順 → リセット（ID昇順）
			resetSort();
		}
	};

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:official:songs",
		columnConfigs,
	);

	const [editingSong, setEditingSong] = useState<OfficialSong | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<OfficialSong | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// 作品一覧を取得（セレクトボックス用）
	const { data: worksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 300_000,
	});

	const { data, isPending, error } = useQuery(
		officialSongsListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			workId: workId || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const songs = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
	};

	// 作品選択肢（カテゴリ別グループ）
	const workGroups = useMemo(() => {
		const works = worksData?.data ?? [];
		const categories = categoriesData?.data ?? [];

		// カテゴリコードをラベルにマッピング
		const categoryMap = new Map(categories.map((c) => [c.code, c.name]));

		// 作品をカテゴリ別にグループ化
		const grouped = new Map<string, { value: string; label: string }[]>();

		for (const w of works) {
			const categoryCode = w.categoryCode || "other";
			if (!grouped.has(categoryCode)) {
				grouped.set(categoryCode, []);
			}
			grouped.get(categoryCode)?.push({
				value: w.id,
				label: w.nameJa || w.name,
			});
		}

		// カテゴリ順にソートしてグループ配列を作成
		const categoryOrder = [
			"pc98",
			"windows",
			"zuns_music_collection",
			"akyus_untouched_score",
			"commercial_books",
			"tasofro",
			"other",
		];

		return categoryOrder
			.filter((code) => grouped.has(code))
			.map((code) => ({
				label: categoryMap.get(code) || code,
				options: grouped.get(code) || [],
			}));
	}, [worksData, categoriesData]);

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await officialSongsApi.delete(deleteTarget.id);
			setDeleteTarget(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		} finally {
			setIsDeleting(false);
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

	const handleWorkIdChange = (value: string) => {
		setWorkId(value);
		setPage(1);
	};

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
					<li>公式楽曲管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">公式楽曲管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="楽曲名で検索..."
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
					secondaryActions={[
						{
							label: "インポート",
							icon: <Upload className="mr-2 h-4 w-4" />,
							onClick: () => setIsImportDialogOpen(true),
						},
					]}
				>
					<SearchableGroupedSelect
						value={workId}
						onChange={handleWorkIdChange}
						groups={workGroups}
						placeholder="作品で絞り込み"
						searchPlaceholder="作品を検索..."
						className="w-80"
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
						columns={5}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									{isVisible("id") && (
										<TableHead
											className="w-[200px] cursor-pointer select-none hover:bg-base-200"
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
									{isVisible("nameJa") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={handleNameJaSort}
										>
											楽曲名
											<SortIcon
												column="nameJa"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("workName") && (
										<TableHead className="min-w-[250px]">作品</TableHead>
									)}
									{isVisible("trackNumber") && (
										<TableHead className="w-[80px]">トラック</TableHead>
									)}
									{isVisible("composerName") && (
										<TableHead className="w-[100px]">作曲者</TableHead>
									)}
									{isVisible("arrangerName") && (
										<TableHead className="w-[100px]">編曲者</TableHead>
									)}
									{isVisible("isOriginal") && (
										<TableHead className="w-[100px]">オリジナル</TableHead>
									)}
									{isVisible("sourceSongName") && (
										<TableHead className="w-[180px]">原曲</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead className="w-[160px]">作成日時</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead className="w-[160px]">更新日時</TableHead>
									)}
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{songs.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									songs.map((s) => (
										<TableRow key={s.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-sm">
													{s.id}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="font-medium">
													<Link
														to="/admin/official/songs/$id"
														params={{ id: s.id }}
														className="hover:text-primary hover:underline"
													>
														{s.nameJa}
													</Link>
												</TableCell>
											)}
											{isVisible("workName") && (
												<TableCell
													className="min-w-[250px] text-sm"
													title={s.workName || undefined}
												>
													{s.workName || "-"}
												</TableCell>
											)}
											{isVisible("trackNumber") && (
												<TableCell className="text-sm">
													{s.trackNumber ?? "-"}
												</TableCell>
											)}
											{isVisible("composerName") && (
												<TableCell className="text-sm">
													{s.composerName || "-"}
												</TableCell>
											)}
											{isVisible("arrangerName") && (
												<TableCell className="text-sm">
													{s.arrangerName || "-"}
												</TableCell>
											)}
											{isVisible("isOriginal") && (
												<TableCell>
													{s.isOriginal ? (
														<Badge variant="outline">Yes</Badge>
													) : (
														<Badge variant="secondary">No</Badge>
													)}
												</TableCell>
											)}
											{isVisible("sourceSongName") && (
												<TableCell
													className="max-w-[180px] truncate text-sm"
													title={s.sourceSongName || undefined}
												>
													{s.sourceSongName || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(s.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(s.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/official/songs/$id"
														params={{ id: s.id }}
													>
														<Button variant="ghost" size="icon">
															<Eye className="h-4 w-4" />
															<span className="sr-only">詳細</span>
														</Button>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingSong(s);
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
														onClick={() => setDeleteTarget(s)}
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
			<OfficialSongEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<OfficialSongEditDialog
				open={!!editingSong}
				onOpenChange={(open) => {
					if (!open) setEditingSong(null);
				}}
				mode="edit"
				song={editingSong}
				onSuccess={invalidateQuery}
			/>

			{/* インポートダイアログ */}
			<ImportDialog
				title="公式楽曲のインポート"
				onImport={importApi.officialSongs}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				title="公式楽曲の削除"
				description={`「${deleteTarget?.nameJa}」を削除しますか？この操作は取り消せません。`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
