import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
	const [editingCode, setEditingCode] = useState<string | null>(null);
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

	const handleUpdate = async (code: string) => {
		try {
			await aliasTypesApi.update(code, {
				label: editForm.label,
				description: editForm.description,
			});
			setEditingCode(null);
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
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="mx-auto max-w-6xl">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>別名義種別管理</CardTitle>
						<div className="flex gap-2">
							<ImportDialog
								title="別名義種別のインポート"
								onImport={importApi.aliasTypes}
								onSuccess={() => loadAliasTypes(page)}
							/>
							<CreateDialog
								title="新規別名義種別"
								fields={[
									{
										name: "code",
										label: "コード",
										placeholder: "コードを入力",
										required: true,
									},
									{
										name: "label",
										label: "ラベル",
										placeholder: "ラベルを入力",
										required: true,
									},
									{
										name: "description",
										label: "説明",
										placeholder: "説明を入力",
									},
								]}
								onCreate={handleCreate}
								onSuccess={() => loadAliasTypes(page)}
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
											<th className="p-3">ラベル</th>
											<th className="p-3">説明</th>
											<th className="p-3">操作</th>
										</tr>
									</thead>
									<tbody>
										{aliasTypes.map((a) => (
											<tr key={a.code} className="border-b">
												<td className="p-3 font-mono text-sm">{a.code}</td>
												<td className="p-3">
													{editingCode === a.code ? (
														<Input
															value={editForm.label || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	label: e.target.value,
																})
															}
														/>
													) : (
														a.label
													)}
												</td>
												<td className="p-3">
													{editingCode === a.code ? (
														<Input
															value={editForm.description || ""}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	description: e.target.value,
																})
															}
														/>
													) : (
														a.description || "-"
													)}
												</td>
												<td className="space-x-2 p-3">
													{editingCode === a.code ? (
														<>
															<Button
																size="sm"
																onClick={() => handleUpdate(a.code)}
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
																	setEditingCode(a.code);
																	setEditForm({
																		label: a.label,
																		description: a.description,
																	});
																}}
															>
																編集
															</Button>
															<Button
																size="sm"
																variant="destructive"
																onClick={() => handleDelete(a.code)}
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
											onClick={() => loadAliasTypes(page - 1)}
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
			</div>
		</div>
	);
}
