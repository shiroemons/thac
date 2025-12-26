import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2 } from "lucide-react";
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
	releasesApi,
	type Track,
	type TrackListItem,
	tracksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/tracks")({
	head: () => createPageHead("トラック"),
	component: TracksPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "トラック名" },
	{ key: "releaseName", label: "作品" },
	{ key: "discNumber", label: "ディスク" },
	{ key: "trackNumber", label: "No." },
	{ key: "event", label: "イベント", defaultVisible: false },
	{ key: "eventDay", label: "イベント日", defaultVisible: false },
	{ key: "vocalists", label: "ボーカル" },
	{ key: "arrangers", label: "編曲" },
	{ key: "lyricists", label: "作詞" },
	{ key: "originalSongs", label: "原曲" },
	{ key: "creditCount", label: "クレジット数", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function TracksPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [releaseFilter, setReleaseFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:tracks",
		columnConfigs,
	);

	const [editingTrack, setEditingTrack] = useState<TrackListItem | null>(null);
	const [editForm, setEditForm] = useState<Partial<Track>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<
		Partial<Track & { releaseId: string }>
	>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 作品一覧取得（フィルター用・新規作成用）
	const { data: releasesData } = useQuery({
		queryKey: ["releases", { limit: 200 }],
		queryFn: () => releasesApi.list({ limit: 200 }),
		staleTime: 60_000,
	});

	// トラック一覧取得（ページネーション対応API）
	const { data, isPending, error } = useQuery({
		queryKey: ["all-tracks", page, pageSize, debouncedSearch, releaseFilter],
		queryFn: () =>
			tracksApi.listPaginated({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				releaseId: releaseFilter || undefined,
			}),
		staleTime: 30_000,
	});

	const tracks = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["all-tracks"] });
		queryClient.invalidateQueries({ queryKey: ["releases"] });
	};

	const handleCreate = async () => {
		if (!createForm.releaseId) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = createId.track();
			await tracksApi.create(createForm.releaseId, {
				id,
				trackNumber: createForm.trackNumber ?? 1,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				discId: createForm.discId || null,
				eventId: null,
				eventDayId: null,
			});
			setIsCreateDialogOpen(false);
			setCreateForm({});
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingTrack) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await tracksApi.update(editingTrack.releaseId, editingTrack.id, {
				trackNumber: editForm.trackNumber,
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				discId: editForm.discId,
			});
			setEditingTrack(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (track: TrackListItem) => {
		if (
			!confirm(
				`「${track.name}」を削除しますか？\n※関連するクレジット情報も削除されます。`,
			)
		)
			return;
		try {
			await tracksApi.delete(track.releaseId, track.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handleEdit = (track: TrackListItem) => {
		setEditingTrack(track);
		setEditForm({
			trackNumber: track.trackNumber,
			name: track.name,
			nameJa: track.nameJa,
			nameEn: track.nameEn,
			discId: track.discId,
		});
		setMutationError(null);
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

	const handleReleaseFilterChange = (value: string) => {
		setReleaseFilter(value);
		setPage(1);
	};

	const releaseOptions =
		releasesData?.data.map((r) => ({
			value: r.id,
			label: r.name,
		})) ?? [];

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
					<li>トラック管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">トラック管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="トラック名で検索..."
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
						value={releaseFilter}
						onChange={(value) => handleReleaseFilterChange(value || "")}
						options={releaseOptions}
						placeholder="作品で絞り込み"
						searchPlaceholder="作品を検索..."
						emptyMessage="作品が見つかりません"
						clearable={true}
						className="w-[200px]"
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
									{isVisible("name") && (
										<TableHead className="min-w-[200px]">トラック名</TableHead>
									)}
									{isVisible("releaseName") && (
										<TableHead className="min-w-[200px]">作品</TableHead>
									)}
									{isVisible("discNumber") && (
										<TableHead className="w-[100px]">ディスク</TableHead>
									)}
									{isVisible("trackNumber") && (
										<TableHead className="w-[60px]">No.</TableHead>
									)}
									{isVisible("event") && (
										<TableHead className="min-w-[150px]">イベント</TableHead>
									)}
									{isVisible("eventDay") && (
										<TableHead className="w-[150px]">イベント日</TableHead>
									)}
									{isVisible("vocalists") && (
										<TableHead className="min-w-[150px]">ボーカル</TableHead>
									)}
									{isVisible("arrangers") && (
										<TableHead className="min-w-[150px]">編曲</TableHead>
									)}
									{isVisible("lyricists") && (
										<TableHead className="min-w-[150px]">作詞</TableHead>
									)}
									{isVisible("originalSongs") && (
										<TableHead className="min-w-[200px]">原曲</TableHead>
									)}
									{isVisible("creditCount") && (
										<TableHead className="w-[100px]">クレジット数</TableHead>
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
								{tracks.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											該当するトラックが見つかりません
										</TableCell>
									</TableRow>
								) : (
									tracks.map((track) => (
										<TableRow key={track.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{track.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													<div>
														<p>{track.name}</p>
														{track.nameJa && (
															<p className="text-base-content/60 text-sm">
																{track.nameJa}
															</p>
														)}
													</div>
												</TableCell>
											)}
											{isVisible("releaseName") && (
												<TableCell className="text-base-content/70">
													{track.releaseName || "-"}
												</TableCell>
											)}
											{isVisible("discNumber") && (
												<TableCell className="text-base-content/70">
													{track.discNumber ? `Disc ${track.discNumber}` : "-"}
												</TableCell>
											)}
											{isVisible("trackNumber") && (
												<TableCell className="text-base-content/70">
													{track.trackNumber}
												</TableCell>
											)}
											{isVisible("event") && (
												<TableCell>
													{track.eventId && track.eventName ? (
														<Link
															to="/admin/events/$id"
															params={{ id: track.eventId }}
															className="text-primary hover:underline"
														>
															{track.eventName}
														</Link>
													) : (
														"-"
													)}
												</TableCell>
											)}
											{isVisible("eventDay") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{track.eventDayDate
														? `${track.eventDayDate}${track.eventDayNumber ? ` (Day ${track.eventDayNumber})` : ""}`
														: "-"}
												</TableCell>
											)}
											{isVisible("vocalists") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.vocalists || "-"}
												</TableCell>
											)}
											{isVisible("arrangers") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.arrangers || "-"}
												</TableCell>
											)}
											{isVisible("lyricists") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.lyricists || "-"}
												</TableCell>
											)}
											{isVisible("originalSongs") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.originalSongs || "-"}
												</TableCell>
											)}
											{isVisible("creditCount") && (
												<TableCell>
													<Badge variant="ghost">{track.creditCount}件</Badge>
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(track.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(track.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/tracks/$id"
														params={{ id: track.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">トラック詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(track)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(track)}
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
						setCreateForm({});
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規トラック</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-release">
								作品 <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={createForm.releaseId || ""}
								onChange={(value) =>
									setCreateForm({ ...createForm, releaseId: value || "" })
								}
								options={releaseOptions}
								placeholder="作品を選択"
								searchPlaceholder="作品を検索..."
								emptyMessage="作品が見つかりません"
								clearable={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								トラック名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) => {
									const newName = e.target.value;
									setCreateForm({
										...createForm,
										name: newName,
										nameJa:
											!createForm.nameJa ||
											createForm.nameJa === createForm.name
												? newName
												: createForm.nameJa,
									});
								}}
								placeholder="例: ネイティブフェイス"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-nameJa">日本語名</Label>
							<Input
								id="create-nameJa"
								value={createForm.nameJa || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, nameJa: e.target.value })
								}
								placeholder="例: ネイティブフェイス"
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
								placeholder="例: Native Face"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-trackNumber">
								トラック番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-trackNumber"
								type="number"
								min={1}
								value={createForm.trackNumber ?? ""}
								onChange={(e) =>
									setCreateForm({
										...createForm,
										trackNumber: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="1"
							/>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
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
							disabled={
								isSubmitting || !createForm.releaseId || !createForm.name
							}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingTrack}
				onOpenChange={(open) => {
					if (!open) {
						setEditingTrack(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>トラックの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>作品</Label>
							<p className="text-base-content/70">
								{editingTrack?.releaseName}
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								トラック名 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) => {
									const newName = e.target.value;
									setEditForm({
										...editForm,
										name: newName,
										nameJa:
											!editForm.nameJa || editForm.nameJa === editForm.name
												? newName
												: editForm.nameJa,
									});
								}}
								placeholder="例: ネイティブフェイス"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-nameJa">日本語名</Label>
							<Input
								id="edit-nameJa"
								value={editForm.nameJa || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, nameJa: e.target.value })
								}
								placeholder="例: ネイティブフェイス"
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
								placeholder="例: Native Face"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-trackNumber">
								トラック番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-trackNumber"
								type="number"
								min={1}
								value={editForm.trackNumber ?? ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										trackNumber: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="1"
							/>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingTrack(null)}>
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
