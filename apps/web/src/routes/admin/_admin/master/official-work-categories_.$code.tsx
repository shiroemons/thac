import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/ui/label";
import { officialWorkCategoriesApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute(
	"/admin/_admin/master/official-work-categories_/$code",
)({
	loader: ({ params }) => officialWorkCategoriesApi.get(params.code),
	head: ({ loaderData }) =>
		createMasterDetailHead("公式作品カテゴリ", loaderData?.name),
	component: OfficialWorkCategoryDetailPage,
});

function OfficialWorkCategoryDetailPage() {
	const category = Route.useLoaderData();

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
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="公式作品カテゴリ詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{
						label: "公式作品カテゴリ",
						href: "/admin/master/official-work-categories",
					},
					{ label: category.name },
				]}
			/>

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
		</div>
	);
}
