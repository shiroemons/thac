import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/ui/label";
import { platformsApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/platforms_/$code")({
	loader: ({ params }) => platformsApi.get(params.code),
	head: ({ loaderData }) =>
		createMasterDetailHead("プラットフォーム", loaderData?.name),
	component: PlatformDetailPage,
});

function PlatformDetailPage() {
	const platform = Route.useLoaderData();

	// エラー・未存在
	if (!platform) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>プラットフォームが見つかりません</span>
				</div>
				<Link to="/admin/master/platforms" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					プラットフォーム一覧に戻る
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="プラットフォーム詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{ label: "プラットフォーム", href: "/admin/master/platforms" },
					{ label: platform.name },
				]}
			/>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">コード</Label>
							<p className="font-mono">{platform.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{platform.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">カテゴリ</Label>
							<p>{platform.category || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{platform.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">URLパターン</Label>
							<p className="font-mono text-sm">{platform.urlPattern || "-"}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
