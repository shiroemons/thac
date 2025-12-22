import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/ui/label";
import { getAliasType } from "@/functions/get-alias-type";
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
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="名義種別詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{ label: "名義種別", href: "/admin/master/alias-types" },
					{ label: aliasType.label },
				]}
			/>

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
		</div>
	);
}
