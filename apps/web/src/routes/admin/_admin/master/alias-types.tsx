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
import { type AliasType, aliasTypesApi, importApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/alias-types")({
	component: AliasTypesPage,
});

function AliasTypesPage() {
	const [aliasTypes, setAliasTypes] = useState<AliasType[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingItem, setEditingItem] = useState<AliasType | null>(null);
	const [editForm, setEditForm] = useState<Partial<AliasType>>({});

	const limit = 20;

	const loadAliasTypes = useCallback(async (p: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await aliasTypesApi.list({ page: p, limit });
			setAliasTypes(res.data);
			setTotal(res.total);
			setPage(p);
		} catch (e) {
			setError(e instanceof Error ? e.message : "読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAliasTypes(1);
	}, [loadAliasTypes]);

	const handleCreate = async (data: Record<string, string>) => {
		await aliasTypesApi.create({
			code: data.code,
			label: data.label,
			description: data.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await aliasTypesApi.update(editingItem.code, {
				label: editForm.label,
				description: editForm.description,
			});
			setEditingItem(null);
			loadAliasTypes(page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await aliasTypesApi.delete(code);
			loadAliasTypes(page);
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
						<CardTitle className="font-bold text-2xl">別名義種別管理</CardTitle>
						<p className="text-muted-foreground text-sm">
							{total}件の別名義種別が登録されています
						</p>
					</div>
					<div className="flex gap-2">
						<ImportDialog
							title="別名義種別のインポート"
							onImport={importApi.aliasTypes}
							onSuccess={() => loadAliasTypes(page)}
						/>
						<CreateDialog
							title="新規別名義種別"
							description="新しい別名義種別を登録します"
							fields={[
								{
									name: "code",
									label: "コード",
									placeholder: "例: romanization",
									required: true,
								},
								{
									name: "label",
									label: "ラベル",
									placeholder: "例: ローマ字表記",
									required: true,
								},
								{
									name: "description",
									label: "説明",
									placeholder: "例: アーティスト名のローマ字表記",
								},
							]}
							onCreate={handleCreate}
							onSuccess={() => loadAliasTypes(page)}
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
											<TableHead className="w-[150px]">コード</TableHead>
											<TableHead className="w-[200px]">ラベル</TableHead>
											<TableHead>説明</TableHead>
											<TableHead className="w-[70px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{aliasTypes.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={4}
													className="h-24 text-center text-muted-foreground"
												>
													データがありません
												</TableCell>
											</TableRow>
										) : (
											aliasTypes.map((a) => (
												<TableRow key={a.code}>
													<TableCell className="font-mono text-sm">
														{a.code}
													</TableCell>
													<TableCell className="font-medium">
														{a.label}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{a.description || "-"}
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
																		setEditingItem(a);
																		setEditForm({
																			label: a.label,
																			description: a.description,
																		});
																	}}
																>
																	<Pencil className="mr-2 h-4 w-4" />
																	編集
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={() => handleDelete(a.code)}
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
										onClick={() => loadAliasTypes(page - 1)}
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
										onClick={() => loadAliasTypes(page + 1)}
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
						<DialogTitle>別名義種別の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingItem?.code || ""} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-label">ラベル</Label>
							<Input
								id="edit-label"
								value={editForm.label || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, label: e.target.value })
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
