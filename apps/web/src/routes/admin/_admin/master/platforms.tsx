import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Badge } from "@/components/ui/badge";
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
import { importApi, type Platform, platformsApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/platforms")({
	component: PlatformsPage,
});

const categoryColors: Record<string, string> = {
	streaming: "bg-blue-500",
	video: "bg-red-500",
	download: "bg-green-500",
	shop: "bg-purple-500",
};

function PlatformsPage() {
	const [platforms, setPlatforms] = useState<Platform[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
	const [editForm, setEditForm] = useState<Partial<Platform>>({});

	const limit = 20;

	const loadPlatforms = useCallback(async (p: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await platformsApi.list({ page: p, limit });
			setPlatforms(res.data);
			setTotal(res.total);
			setPage(p);
		} catch (e) {
			setError(e instanceof Error ? e.message : "読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPlatforms(1);
	}, [loadPlatforms]);

	const handleCreate = async (data: Record<string, string>) => {
		await platformsApi.create({
			code: data.code,
			name: data.name,
			category: data.category || null,
			urlPattern: data.urlPattern || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingPlatform) return;
		try {
			await platformsApi.update(editingPlatform.code, {
				name: editForm.name,
				category: editForm.category,
				urlPattern: editForm.urlPattern,
			});
			setEditingPlatform(null);
			loadPlatforms(page);
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await platformsApi.delete(code);
			loadPlatforms(page);
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
							プラットフォーム管理
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{total}件のプラットフォームが登録されています
						</p>
					</div>
					<div className="flex gap-2">
						<ImportDialog
							title="プラットフォームのインポート"
							onImport={importApi.platforms}
							onSuccess={() => loadPlatforms(page)}
						/>
						<CreateDialog
							title="新規プラットフォーム"
							description="新しいプラットフォームを登録します"
							fields={[
								{
									name: "code",
									label: "コード",
									placeholder: "例: spotify",
									required: true,
								},
								{
									name: "name",
									label: "名前",
									placeholder: "例: Spotify",
									required: true,
								},
								{
									name: "category",
									label: "カテゴリ",
									placeholder: "例: streaming",
								},
								{
									name: "urlPattern",
									label: "URLパターン",
									placeholder: "例: ^https?://open\\.spotify\\.com/",
								},
							]}
							onCreate={handleCreate}
							onSuccess={() => loadPlatforms(page)}
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
											<TableHead>名前</TableHead>
											<TableHead className="w-[120px]">カテゴリ</TableHead>
											<TableHead>URLパターン</TableHead>
											<TableHead className="w-[70px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{platforms.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="h-24 text-center text-muted-foreground"
												>
													データがありません
												</TableCell>
											</TableRow>
										) : (
											platforms.map((p) => (
												<TableRow key={p.code}>
													<TableCell className="font-mono text-sm">
														{p.code}
													</TableCell>
													<TableCell className="font-medium">
														{p.name}
													</TableCell>
													<TableCell>
														{p.category ? (
															<Badge
																variant="secondary"
																className={`${categoryColors[p.category] || "bg-gray-500"} text-white`}
															>
																{p.category}
															</Badge>
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</TableCell>
													<TableCell className="max-w-[300px] truncate font-mono text-muted-foreground text-xs">
														{p.urlPattern || "-"}
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
																		setEditingPlatform(p);
																		setEditForm({
																			name: p.name,
																			category: p.category,
																			urlPattern: p.urlPattern,
																		});
																	}}
																>
																	<Pencil className="mr-2 h-4 w-4" />
																	編集
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={() => handleDelete(p.code)}
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
										onClick={() => loadPlatforms(page - 1)}
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
										onClick={() => loadPlatforms(page + 1)}
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
				open={!!editingPlatform}
				onOpenChange={(open) => !open && setEditingPlatform(null)}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>プラットフォームの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingPlatform?.code || ""} disabled />
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
							<Label htmlFor="edit-category">カテゴリ</Label>
							<Input
								id="edit-category"
								value={editForm.category || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, category: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-urlPattern">URLパターン</Label>
							<Input
								id="edit-urlPattern"
								value={editForm.urlPattern || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, urlPattern: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingPlatform(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
