import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/ui/label";
import { getCreditRole } from "@/functions/get-credit-role";
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
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="クレジット役割詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{ label: "クレジット役割", href: "/admin/master/credit-roles" },
					{ label: creditRole.label },
				]}
			/>

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
		</div>
	);
}
