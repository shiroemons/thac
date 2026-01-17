import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CreditRoleEditDialog } from "@/components/admin/credit-role-edit-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { getCreditRole } from "@/functions/get-credit-role";
import { createMasterDetailHead } from "@/lib/head";
import { creditRoleMutations } from "@/lib/mutation-options";

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
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// Mutations
	const deleteMutation = useMutation(creditRoleMutations.delete(queryClient));

	const handleDelete = () => {
		if (!creditRole) return;
		deleteMutation.mutate(creditRole.code, {
			onSuccess: () => {
				setIsDeleteDialogOpen(false);
				navigate({ to: "/admin/master/credit-roles" });
			},
		});
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
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditDialogOpen(true)}
					>
						<Pencil className="mr-2 h-4 w-4" />
						編集
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-error hover:text-error"
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						削除
					</Button>
				</div>
			</div>

			{deleteMutation.error && (
				<div className="alert alert-error">
					<span>
						{deleteMutation.error instanceof Error
							? deleteMutation.error.message
							: "削除に失敗しました。使用中の可能性があります。"}
					</span>
				</div>
			)}

			{/* 基本情報カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/70">コード</Label>
							<p className="font-mono">{creditRole.code}</p>
						</div>
						<div>
							<Label className="text-base-content/70">ラベル</Label>
							<p className="font-medium">{creditRole.label}</p>
						</div>
						<div>
							<Label className="text-base-content/70">表示順序</Label>
							<p>{creditRole.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/70">説明</Label>
							<p>{creditRole.description || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<CreditRoleEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				creditRole={creditRole}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["creditRoles"] });
					window.location.reload();
				}}
			/>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) deleteMutation.reset();
				}}
				title="クレジット役割の削除"
				description={
					<div>
						<p>「{creditRole?.label}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※使用中の場合は削除できません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
