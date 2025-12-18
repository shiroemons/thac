import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
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
import { useDebounce } from "@/hooks/use-debounce";
import { type EventSeries, eventSeriesApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/event-series")({
	component: EventSeriesPage,
});

function EventSeriesPage() {
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);

	const [editingSeries, setEditingSeries] = useState<EventSeries | null>(null);
	const [editForm, setEditForm] = useState<Partial<EventSeries>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<EventSeries>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["event-series", debouncedSearch],
		queryFn: () => eventSeriesApi.list(debouncedSearch || undefined),
		staleTime: 30_000,
	});

	const seriesList = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["event-series"] });
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			await eventSeriesApi.create({
				id,
				name: createForm.name || "",
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
		if (!editingSeries) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await eventSeriesApi.update(editingSeries.id, {
				name: editForm.name,
			});
			setEditingSeries(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (series: EventSeries) => {
		if (
			!confirm(
				`「${series.name}」を削除しますか？\n※イベントが紐付いている場合は削除できません。`,
			)
		)
			return;
		try {
			await eventSeriesApi.delete(series.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handleEdit = (series: EventSeries) => {
		setEditingSeries(series);
		setEditForm({
			name: series.name,
		});
		setMutationError(null);
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="イベントシリーズ管理"
				breadcrumbs={[
					{ label: "イベント管理", href: "/admin/events" },
					{ label: "シリーズ" },
				]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="シリーズ名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
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
						columns={3}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<Table zebra>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>シリーズ名</TableHead>
								<TableHead className="w-[180px]">作成日</TableHead>
								<TableHead className="w-[70px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{seriesList.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3}
										className="h-24 text-center text-base-content/50"
									>
										該当するシリーズが見つかりません
									</TableCell>
								</TableRow>
							) : (
								seriesList.map((series) => (
									<TableRow key={series.id}>
										<TableCell className="font-medium">{series.name}</TableCell>
										<TableCell className="text-base-content/70">
											{new Date(series.createdAt).toLocaleDateString("ja-JP")}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(series)}
												>
													<Pencil className="h-4 w-4" />
													<span className="sr-only">編集</span>
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-error hover:text-error"
													onClick={() => handleDelete(series)}
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
				)}

				<div className="border-base-300 border-t p-4 text-base-content/70 text-sm">
					全 {total} 件
				</div>
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
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
								placeholder="例: コミックマーケット"
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
							disabled={isSubmitting || !createForm.name?.trim()}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingSeries}
				onOpenChange={(open) => {
					if (!open) {
						setEditingSeries(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>シリーズの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
							/>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingSeries(null)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleUpdate}
							disabled={isSubmitting || !editForm.name?.trim()}
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
