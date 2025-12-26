import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { PlatformEditDialog } from "@/components/admin/platform-edit-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { platformsApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";
import { platformDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/master/platforms_/$code")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			platformDetailQueryOptions(params.code),
		),
	head: ({ loaderData }) =>
		createMasterDetailHead("プラットフォーム", loaderData?.name),
	component: PlatformDetailPage,
});

function PlatformDetailPage() {
	const { code } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: platform, isPending } = useQuery(
		platformDetailQueryOptions(code),
	);

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEdit = () => {
		if (!platform) return;
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!platform) return;
		if (
			!confirm(
				`「${platform.name}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await platformsApi.delete(platform.code);
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
			navigate({ to: "/admin/master/platforms" });
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "削除に失敗しました。使用中の可能性があります。",
			);
			setIsDeleting(false);
		}
	};

	// ローディング
	if (isPending && !platform) {
		return <DetailPageSkeleton cardCount={1} fieldsPerCard={5} />;
	}

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
						<Link to="/admin/master/platforms">プラットフォーム管理</Link>
					</li>
					<li>{platform.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/master/platforms" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{platform.name}</h1>
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

			{/* 編集ダイアログ */}
			<PlatformEditDialog
				mode="edit"
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				platform={platform}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["platform", code] });
				}}
			/>
		</div>
	);
}
