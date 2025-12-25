import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { getCreditRole } from "@/functions/get-credit-role";
import { type CreditRole, creditRolesApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute(
	"/admin/_admin/master/credit-roles_/$code",
)({
	loader: ({ params }) => getCreditRole(params.code),
	head: ({ loaderData }) =>
		createMasterDetailHead("クレジット役割", loaderData?.label),
	component: CreditRoleDetailPage,
});

function CreditRoleDetailPage() {
	const creditRole = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<Partial<CreditRole>>({});
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEdit = () => {
		if (!creditRole) return;
		setEditForm({
			label: creditRole.label,
			description: creditRole.description,
		});
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async () => {
		if (!creditRole) return;
		setError(null);
		try {
			await creditRolesApi.update(creditRole.code, {
				label: editForm.label,
				description: editForm.description,
			});
			setIsEditDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async () => {
		if (!creditRole) return;
		if (
			!confirm(
				`「${creditRole.label}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await creditRolesApi.delete(creditRole.code);
			queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
			navigate({ to: "/admin/master/credit-roles" });
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "削除に失敗しました。使用中の可能性があります。",
			);
			setIsDeleting(false);
		}
	};

	// エラー・未存在
	if (!creditRole) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>クレジット役割が見つかりません</span>
				</div>
				<Link to="/admin/master/credit-roles" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					クレジット役割一覧に戻る
				</Link>
			</div>
		);
	}

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
					<li>
						<Link to="/admin/master/credit-roles">クレジット役割管理</Link>
					</li>
					<li>{creditRole.label}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						to="/admin/master/credit-roles"
						className="btn btn-ghost btn-sm"
					>
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{creditRole.label}</h1>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleEdit}>
						<Pencil className="mr-2 h-4 w-4" />
						編集
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-error hover:text-error"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						{isDeleting ? "削除中..." : "削除"}
					</Button>
				</div>
			</div>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">コード</Label>
							<p className="font-mono">{creditRole.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">ラベル</Label>
							<p className="font-medium">{creditRole.label}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{creditRole.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">説明</Label>
							<p>{creditRole.description || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>クレジット役割の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={creditRole.code} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-label">ラベル</Label>
							<Input
								id="edit-label"
								value={editForm.label || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, label: e.target.value })
								}
								placeholder="例: ボーカル"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-description">説明</Label>
							<Textarea
								id="edit-description"
								value={editForm.description || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, description: e.target.value })
								}
								placeholder="例: 歌唱を担当するクレジット"
							/>
						</div>
					</div>
					{error && <div className="mb-4 text-error text-sm">{error}</div>}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
