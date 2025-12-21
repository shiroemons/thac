import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
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
	importApi,
	type OfficialSong,
	officialSongsApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/official/songs")({
	head: () => createPageHead("公式楽曲"),
	component: OfficialSongsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "楽曲名" },
	{ key: "workName", label: "作品" },
	{ key: "themeType", label: "主題区分" },
	{ key: "isOriginal", label: "オリジナル" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

const themeTypeOptions = [
	{ value: "character", label: "キャラクター" },
	{ value: "stage", label: "ステージ" },
	{ value: "event", label: "イベント" },
	{ value: "bgm", label: "BGM" },
	{ value: "other", label: "その他" },
];

const themeTypeLabels: Record<string, string> = {
	character: "キャラクター",
	stage: "ステージ",
	event: "イベント",
	bgm: "BGM",
	other: "その他",
};

function OfficialSongsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [themeType, setThemeType] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:official:songs",
		columnConfigs,
	);

	const [editingSong, setEditingSong] = useState<OfficialSong | null>(null);
	const [editForm, setEditForm] = useState<Partial<OfficialSong>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	// 作品一覧を取得（セレクトボックス用）
	const { data: worksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

	const { data, isLoading, error } = useQuery({
		queryKey: ["officialSongs", page, pageSize, debouncedSearch, themeType],
		queryFn: () =>
			officialSongsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				themeType: themeType || undefined,
			}),
		staleTime: 30_000,
	});

	const songs = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
	};

	const handleCreate = async (formData: Record<string, string>) => {
		await officialSongsApi.create({
			id: formData.id,
			officialWorkId: formData.officialWorkId || null,
			trackNumber: formData.trackNumber
				? Number.parseInt(formData.trackNumber, 10)
				: null,
			name: formData.name,
			nameJa: formData.nameJa,
			nameEn: formData.nameEn || null,
			themeType: formData.themeType || null,
			composerName: formData.composerName || null,
			arrangerName: formData.arrangerName || null,
			isOriginal: formData.isOriginal !== "false",
			sourceSongId: formData.sourceSongId || null,
			notes: formData.notes || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingSong) return;

		// 自己参照チェック
		if (editForm.sourceSongId === editingSong.id) {
			setMutationError("自身を原曲に指定することはできません");
			return;
		}

		try {
			await officialSongsApi.update(editingSong.id, {
				officialWorkId: editForm.officialWorkId,
				trackNumber: editForm.trackNumber,
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				themeType: editForm.themeType,
				composerName: editForm.composerName,
				arrangerName: editForm.arrangerName,
				isOriginal: editForm.isOriginal,
				sourceSongId: editForm.sourceSongId,
				notes: editForm.notes,
			});
			setEditingSong(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("この楽曲を削除しますか？")) return;
		try {
			await officialSongsApi.delete(id);
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

	const handleThemeTypeChange = (value: string) => {
		setThemeType(value);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="公式楽曲管理"
				breadcrumbs={[{ label: "公式管理" }, { label: "公式楽曲" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="楽曲名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={themeTypeOptions}
					filterValue={themeType}
					filterPlaceholder="主題区分を選択"
					onFilterChange={handleThemeTypeChange}
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
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isLoading ? (
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
										<TableHead className="w-[200px]">ID</TableHead>
									)}
									{isVisible("nameJa") && <TableHead>楽曲名</TableHead>}
									{isVisible("workName") && (
										<TableHead className="w-[150px]">作品</TableHead>
									)}
									{isVisible("themeType") && (
										<TableHead className="w-[120px]">主題区分</TableHead>
									)}
									{isVisible("isOriginal") && (
										<TableHead className="w-[100px]">オリジナル</TableHead>
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
													{s.nameJa}
												</TableCell>
											)}
											{isVisible("workName") && (
												<TableCell className="text-sm">
													{s.workName || "-"}
												</TableCell>
											)}
											{isVisible("themeType") && (
												<TableCell>
													{s.themeType ? (
														<Badge variant="secondary">
															{themeTypeLabels[s.themeType] || s.themeType}
														</Badge>
													) : (
														<span className="text-base-content/50">-</span>
													)}
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
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingSong(s);
															setEditForm({
																officialWorkId: s.officialWorkId,
																trackNumber: s.trackNumber,
																name: s.name,
																nameJa: s.nameJa,
																nameEn: s.nameEn,
																themeType: s.themeType,
																composerName: s.composerName,
																arrangerName: s.arrangerName,
																isOriginal: s.isOriginal,
																sourceSongId: s.sourceSongId,
																notes: s.notes,
															});
														}}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(s.id)}
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
			<CreateDialog
				title="新規公式楽曲"
				description="新しい公式楽曲を登録します"
				fields={[
					{
						name: "id",
						label: "ID",
						placeholder: "例: th06-01",
						required: true,
					},
					{
						name: "officialWorkId",
						label: "作品ID",
						placeholder: "例: th06",
					},
					{
						name: "trackNumber",
						label: "トラック番号",
						placeholder: "例: 1",
					},
					{
						name: "name",
						label: "名前",
						placeholder: "例: A Soul as Red as a Ground Cherry",
						required: true,
					},
					{
						name: "nameJa",
						label: "日本語名",
						placeholder: "例: 赤より紅い夢",
						required: true,
					},
					{
						name: "nameEn",
						label: "英語名",
						placeholder: "例: A Soul as Red as a Ground Cherry",
					},
					{
						name: "themeType",
						label: "主題区分",
						placeholder: "例: stage",
					},
					{
						name: "composerName",
						label: "作曲者名",
						placeholder: "例: ZUN",
					},
					{
						name: "arrangerName",
						label: "編曲者名",
						placeholder: "例: ZUN",
					},
					{
						name: "isOriginal",
						label: "オリジナル",
						placeholder: "true または false",
					},
					{
						name: "sourceSongId",
						label: "原曲ID",
						placeholder: "例: th06-01",
					},
					{
						name: "notes",
						label: "備考",
						placeholder: "備考を入力",
					},
				]}
				onCreate={handleCreate}
				onSuccess={invalidateQuery}
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingSong}
				onOpenChange={(open) => !open && setEditingSong(null)}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>公式楽曲の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>ID</Label>
							<Input value={editingSong?.id || ""} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-officialWorkId">作品ID</Label>
							<select
								id="edit-officialWorkId"
								className="select select-bordered w-full"
								value={editForm.officialWorkId || ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										officialWorkId: e.target.value || null,
									})
								}
							>
								<option value="">選択なし</option>
								{worksData?.data.map((w) => (
									<option key={w.id} value={w.id}>
										{w.nameJa}
									</option>
								))}
							</select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
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
								<Label htmlFor="edit-themeType">主題区分</Label>
								<select
									id="edit-themeType"
									className="select select-bordered w-full"
									value={editForm.themeType || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											themeType: e.target.value || null,
										})
									}
								>
									<option value="">選択なし</option>
									{themeTypeOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-composerName">作曲者名</Label>
								<Input
									id="edit-composerName"
									value={editForm.composerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, composerName: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-arrangerName">編曲者名</Label>
								<Input
									id="edit-arrangerName"
									value={editForm.arrangerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, arrangerName: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-isOriginal">オリジナル</Label>
								<select
									id="edit-isOriginal"
									className="select select-bordered w-full"
									value={editForm.isOriginal ? "true" : "false"}
									onChange={(e) =>
										setEditForm({
											...editForm,
											isOriginal: e.target.value === "true",
										})
									}
								>
									<option value="true">はい</option>
									<option value="false">いいえ</option>
								</select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-sourceSongId">原曲ID</Label>
							<Input
								id="edit-sourceSongId"
								value={editForm.sourceSongId || ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										sourceSongId: e.target.value || null,
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-notes">備考</Label>
							<Input
								id="edit-notes"
								value={editForm.notes || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, notes: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingSong(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* インポートダイアログ */}
			<ImportDialog
				title="公式楽曲のインポート"
				onImport={importApi.officialSongs}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
