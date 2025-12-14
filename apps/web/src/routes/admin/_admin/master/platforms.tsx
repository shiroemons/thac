import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { importApi, type Platform, platformsApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/platforms")({
	component: PlatformsPage,
});

function PlatformsPage() {
	const [platforms, setPlatforms] = useState<Platform[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingCode, setEditingCode] = useState<string | null>(null);
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

	const handleUpdate = async (code: string) => {
		try {
			await platformsApi.update(code, {
				name: editForm.name,
				category: editForm.category,
				urlPattern: editForm.urlPattern,
			});
			setEditingCode(null);
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
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="mx-auto max-w-6xl">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>プラットフォーム管理</CardTitle>
						<div className="flex gap-2">
							<ImportDialog
								title="プラットフォームのインポート"
								onImport={importApi.platforms}
								onSuccess={() => loadPlatforms(page)}
							/>
							<CreateDialog
								title="新規プラットフォーム"
								fields={[
									{
										name: "code",
										label: "コード",
										placeholder: "コードを入力",
										required: true,
									},
									{
										name: "name",
										label: "名前",
										placeholder: "名前を入力",
										required: true,
									},
									{
										name: "category",
										label: "カテゴリ",
										placeholder: "カテゴリを入力",
									},
									{
										name: "urlPattern",
										label: "URLパターン",
										placeholder: "URLパターンを入力",
									},
								]}
								onCreate={handleCreate}
								onSuccess={() => loadPlatforms(page)}
							/>
						</div>
					</CardHeader>
					<CardContent>
						{error && (
							<div className="mb-4 rounded bg-red-100 p-3 text-red-700">
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
								<table className="w-full text-left">
									<thead className="border-b bg-slate-700 text-white">
										<tr>
											<th className="p-3">コード</th>
											<th className="p-3">名前</th>
											<th className="p-3">カテゴリ</th>
											<th className="p-3">URLパターン</th>
											<th className="p-3">操作</th>
										</tr>
									</thead>
									<tbody>
										{platforms.map((p) => (
											<tr key={p.code} className="border-b">
												<td className="p-3 font-mono text-sm">{p.code}</td>
												<td className="p-3">
													{editingCode === p.code ? (
														<Input
															value={editForm.name || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	name: e.target.value,
																})
															}
														/>
													) : (
														p.name
													)}
												</td>
												<td className="p-3">
													{editingCode === p.code ? (
														<Input
															value={editForm.category || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	category: e.target.value,
																})
															}
														/>
													) : (
														p.category || "-"
													)}
												</td>
												<td className="p-3 font-mono text-xs">
													{editingCode === p.code ? (
														<Input
															value={editForm.urlPattern || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	urlPattern: e.target.value,
																})
															}
														/>
													) : (
														p.urlPattern || "-"
													)}
												</td>
												<td className="space-x-2 p-3">
													{editingCode === p.code ? (
														<>
															<Button
																size="sm"
																onClick={() => handleUpdate(p.code)}
															>
																保存
															</Button>
															<Button
																size="sm"
																variant="outline"
																onClick={() => setEditingCode(null)}
															>
																キャンセル
															</Button>
														</>
													) : (
														<>
															<Button
																size="sm"
																variant="outline"
																onClick={() => {
																	setEditingCode(p.code);
																	setEditForm({
																		name: p.name,
																		category: p.category,
																		urlPattern: p.urlPattern,
																	});
																}}
															>
																編集
															</Button>
															<Button
																size="sm"
																variant="destructive"
																onClick={() => handleDelete(p.code)}
															>
																削除
															</Button>
														</>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>

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
										<span className="text-sm">
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
			</div>
		</div>
	);
}
