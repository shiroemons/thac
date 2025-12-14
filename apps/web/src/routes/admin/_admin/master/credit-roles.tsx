import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
	const [editingCode, setEditingCode] = useState<string | null>(null);
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

	const handleUpdate = async (code: string) => {
		try {
			await creditRolesApi.update(code, {
				label: editForm.label,
				description: editForm.description,
			});
			setEditingCode(null);
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
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="mx-auto max-w-6xl">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>クレジット役割管理</CardTitle>
						<div className="flex gap-2">
							<ImportDialog
								title="クレジット役割のインポート"
								onImport={importApi.creditRoles}
								onSuccess={() => loadCreditRoles(page)}
							/>
							<CreateDialog
								title="新規クレジット役割"
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
								onSuccess={() => loadCreditRoles(page)}
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
										{creditRoles.map((c) => (
											<tr key={c.code} className="border-b">
												<td className="p-3 font-mono text-sm">{c.code}</td>
												<td className="p-3">
													{editingCode === c.code ? (
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
														c.label
													)}
												</td>
												<td className="p-3">
													{editingCode === c.code ? (
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
														c.description || "-"
													)}
												</td>
												<td className="space-x-2 p-3">
													{editingCode === c.code ? (
														<>
															<Button
																size="sm"
																onClick={() => handleUpdate(c.code)}
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
																	setEditingCode(c.code);
																	setEditForm({
																		label: c.label,
																		description: c.description,
																	});
																}}
															>
																編集
															</Button>
															<Button
																size="sm"
																variant="destructive"
																onClick={() => handleDelete(c.code)}
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
											onClick={() => loadCreditRoles(page - 1)}
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
			</div>
		</div>
	);
}
