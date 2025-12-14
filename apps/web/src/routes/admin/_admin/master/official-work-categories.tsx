import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	importApi,
	type OfficialWorkCategory,
	officialWorkCategoriesApi,
} from "@/lib/api-client";

export const Route = createFileRoute(
	"/admin/_admin/master/official-work-categories",
)({
	component: OfficialWorkCategoriesPage,
});

function OfficialWorkCategoriesPage() {
	const [categories, setCategories] = useState<OfficialWorkCategory[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingItem, setEditingItem] = useState<OfficialWorkCategory | null>(
		null,
	);
	const [editForm, setEditForm] = useState<Partial<OfficialWorkCategory>>({});

	const limit = 20;

	const loadCategories = useCallback(async (p: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await officialWorkCategoriesApi.list({ page: p, limit });
			setCategories(res.data);
			setTotal(res.total);
			setPage(p);
		} catch (e) {
			setError(e instanceof Error ? e.message : "読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCategories(1);
	}, [loadCategories]);

	const handleCreate = async (data: Record<string, string>) => {
		await officialWorkCategoriesApi.create({
			code: data.code,
			name: data.name,
			description: data.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await officialWorkCategoriesApi.update(editingItem.code, {
				name: editForm.name,
				description: editForm.description,
			});
			setEditingItem(null);
			loadCategories(page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await officialWorkCategoriesApi.delete(code);
			loadCategories(page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="container mx-auto py-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<div>
						<CardTitle className="font-bold text-2xl">
							公式作品カテゴリ管理
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{total}件の公式作品カテゴリが登録されています
						</p>
					</div>
					<div className="flex gap-2">
						<ImportDialog
							title="公式作品カテゴリのインポート"
							onImport={importApi.officialWorkCategories}
							onSuccess={() => loadCategories(page)}
						/>
						<CreateDialog
							title="新規公式作品カテゴリ"
							description="新しい公式作品カテゴリを登録します"
							fields={[
								{
									name: "code",
									label: "コード",
									placeholder: "例: windows",
									required: true,
								},
								{
									name: "name",
									label: "名前",
									placeholder: "例: Windows作品",
									required: true,
								},
								{
									name: "description",
									label: "説明",
									placeholder: "例: Windows向けに発売された作品",
								},
							]}
							onCreate={handleCreate}
							onSuccess={() => loadCategories(page)}
						/>
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
							{error}
						</div>
					)}

					{loading ? (
						<div className="space-y-2">
							{[...Array(5)].map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : (
						<>
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[200px]">コード</TableHead>
											<TableHead className="w-[200px]">名前</TableHead>
											<TableHead>説明</TableHead>
											<TableHead className="w-[70px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{categories.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={4}
													className="h-24 text-center text-muted-foreground"
												>
													データがありません
												</TableCell>
											</TableRow>
										) : (
											categories.map((c) => (
												<TableRow key={c.code}>
													<TableCell className="font-mono text-sm">
														{c.code}
													</TableCell>
													<TableCell className="font-medium">
														{c.name}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{c.description || "-"}
													</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="icon">
																	<MoreHorizontal className="h-4 w-4" />
																	<span className="sr-only">
																		メニューを開く
																	</span>
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => {
																		setEditingItem(c);
																		setEditForm({
																			name: c.name,
																			description: c.description,
																		});
																	}}
																>
																	<Pencil className="mr-2 h-4 w-4" />
																	編集
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={() => handleDelete(c.code)}
																>
																	<Trash2 className="mr-2 h-4 w-4" />
																	削除
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							{totalPages > 1 && (
								<div className="mt-4 flex items-center justify-center gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={page === 1}
										onClick={() => loadCategories(page - 1)}
									>
										前へ
									</Button>
									<span className="text-muted-foreground text-sm">
										{page} / {totalPages}
									</span>
									<Button
										size="sm"
										variant="outline"
										disabled={page === totalPages}
										onClick={() => loadCategories(page + 1)}
									>
										次へ
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingItem}
				onOpenChange={(open) => !open && setEditingItem(null)}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>公式作品カテゴリの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingItem?.code || ""} disabled />
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
						<div className="grid gap-2">
							<Label htmlFor="edit-description">説明</Label>
							<Input
								id="edit-description"
								value={editForm.description || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, description: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingItem(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
