import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { OfficialWorkCategoryEditDialog } from "@/components/admin/official-work-category-edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getOfficialWorkCategory } from "@/functions/get-official-work-category";
import { officialWorkCategoriesApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute(
	"/admin/_admin/master/official-work-categories_/$code",
)({
	loader: ({ params }) => getOfficialWorkCategory(params.code),
	head: ({ loaderData }) =>
		createMasterDetailHead("公式作品カテゴリ", loaderData?.name),
	component: OfficialWorkCategoryDetailPage,
});

function OfficialWorkCategoryDetailPage() {
	const category = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialWorkCategories"] });
	};

	const handleEdit = () => {
		if (!category) return;
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!category) return;
		if (
			!confirm(
				`「${category.name}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await officialWorkCategoriesApi.delete(category.code);
			invalidateQuery();
			navigate({ to: "/admin/master/official-work-categories" });
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
	if (!category) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>公式作品カテゴリが見つかりません</span>
				</div>
				<Link
					to="/admin/master/official-work-categories"
					className="btn btn-ghost mt-4"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					公式作品カテゴリ一覧に戻る
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
						<Link to="/admin/master/official-work-categories">
							公式作品カテゴリ管理
						</Link>
					</li>
					<li>{category.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						to="/admin/master/official-work-categories"
						className="btn btn-ghost btn-sm"
					>
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{category.name}</h1>
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
							<p className="font-mono">{category.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{category.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{category.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">説明</Label>
							<p>{category.description || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<OfficialWorkCategoryEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				category={category}
				onSuccess={() => {
					invalidateQuery();
					window.location.reload();
				}}
			/>
		</div>
	);
}
