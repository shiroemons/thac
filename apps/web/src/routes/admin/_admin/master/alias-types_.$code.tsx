import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AliasTypeEditDialog } from "@/components/admin/alias-type-edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getAliasType } from "@/functions/get-alias-type";
import { aliasTypesApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/alias-types_/$code")(
	{
		loader: ({ params }) => getAliasType(params.code),
		head: ({ loaderData }) =>
			createMasterDetailHead("名義種別", loaderData?.label),
		component: AliasTypeDetailPage,
	},
);

function AliasTypeDetailPage() {
	const aliasType = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEditSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
		window.location.reload();
	};

	const handleDelete = async () => {
		if (!aliasType) return;
		if (
			!confirm(
				`「${aliasType.label}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await aliasTypesApi.delete(aliasType.code);
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
			navigate({ to: "/admin/master/alias-types" });
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
	if (!aliasType) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>名義種別が見つかりません</span>
				</div>
				<Link to="/admin/master/alias-types" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					名義種別一覧に戻る
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
						<Link to="/admin/master/alias-types">名義種別管理</Link>
					</li>
					<li>{aliasType.label}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/master/alias-types" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{aliasType.label}</h1>
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
							<p className="font-mono">{aliasType.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">ラベル</Label>
							<p className="font-medium">{aliasType.label}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{aliasType.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">説明</Label>
							<p>{aliasType.description || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<AliasTypeEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				aliasType={aliasType}
				onSuccess={handleEditSuccess}
			/>
		</div>
	);
}
