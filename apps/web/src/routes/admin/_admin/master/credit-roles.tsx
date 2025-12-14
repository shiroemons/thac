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
import { type CreditRole, creditRolesApi, importApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/credit-roles")({
	component: CreditRolesPage,
});

function CreditRolesPage() {
	const [creditRoles, setCreditRoles] = useState<CreditRole[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingItem, setEditingItem] = useState<CreditRole | null>(null);
	const [editForm, setEditForm] = useState<Partial<CreditRole>>({});

	const limit = 20;

	const loadCreditRoles = useCallback(async (p: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await creditRolesApi.list({ page: p, limit });
			setCreditRoles(res.data);
			setTotal(res.total);
			setPage(p);
		} catch (e) {
			setError(e instanceof Error ? e.message : "読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCreditRoles(1);
	}, [loadCreditRoles]);

	const handleCreate = async (data: Record<string, string>) => {
		await creditRolesApi.create({
			code: data.code,
			label: data.label,
			description: data.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await creditRolesApi.update(editingItem.code, {
				label: editForm.label,
				description: editForm.description,
			});
			setEditingItem(null);
			loadCreditRoles(page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await creditRolesApi.delete(code);
			loadCreditRoles(page);
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
							クレジット役割管理
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{total}件のクレジット役割が登録されています
						</p>
					</div>
					<div className="flex gap-2">
						<ImportDialog
							title="クレジット役割のインポート"
							onImport={importApi.creditRoles}
							onSuccess={() => loadCreditRoles(page)}
						/>
						<CreateDialog
							title="新規クレジット役割"
							description="新しいクレジット役割を登録します"
							fields={[
								{
									name: "code",
									label: "コード",
									placeholder: "例: composer",
									required: true,
								},
								{
									name: "label",
									label: "ラベル",
									placeholder: "例: 作曲",
									required: true,
								},
								{
									name: "description",
									label: "説明",
									placeholder: "例: 楽曲の作曲者",
								},
							]}
							onCreate={handleCreate}
							onSuccess={() => loadCreditRoles(page)}
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
										{creditRoles.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={4}
													className="h-24 text-center text-muted-foreground"
												>
													データがありません
												</TableCell>
											</TableRow>
										) : (
											creditRoles.map((c) => (
												<TableRow key={c.code}>
													<TableCell className="font-mono text-sm">
														{c.code}
													</TableCell>
													<TableCell className="font-medium">
														{c.label}
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
																			label: c.label,
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
										onClick={() => loadCreditRoles(page - 1)}
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
										onClick={() => loadCreditRoles(page + 1)}
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
						<DialogTitle>クレジット役割の編集</DialogTitle>
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
