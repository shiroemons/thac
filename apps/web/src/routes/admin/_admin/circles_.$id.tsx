import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getCircle } from "@/functions/get-circle";
import {
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createCircleDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/circles_/$id")({
	loader: ({ params }) => getCircle(params.id),
	head: ({ loaderData }) => createCircleDetailHead(loaderData?.name),
	component: CircleDetailPage,
});

function CircleDetailPage() {
	const circle = Route.useLoaderData();

	// エラー・未存在
	if (!circle) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>サークルが見つかりません</span>
				</div>
				<Link to="/admin/circles" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					サークル一覧に戻る
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="サークル詳細"
				breadcrumbs={[
					{ label: "サークル", href: "/admin/circles" },
					{ label: circle.name },
				]}
			/>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{circle.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">日本語名</Label>
							<p>{circle.nameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">英語名</Label>
							<p>{circle.nameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">ソート用名</Label>
							<p>{circle.sortName || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">文字種</Label>
							<p>
								<Badge
									variant={INITIAL_SCRIPT_BADGE_VARIANTS[circle.initialScript]}
								>
									{INITIAL_SCRIPT_LABELS[circle.initialScript]}
								</Badge>
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">頭文字</Label>
							<p className="font-mono">{circle.nameInitial || "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">備考</Label>
							<p className="whitespace-pre-wrap">{circle.notes || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 外部リンク一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">外部リンク一覧</h2>

					{circle.links.length === 0 ? (
						<p className="text-base-content/60">
							外部リンクが登録されていません
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>プラットフォーム</TableHead>
										<TableHead>URL</TableHead>
										<TableHead className="w-[100px]">公式</TableHead>
										<TableHead className="w-[100px]">メイン</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{circle.links.map((link) => (
										<TableRow key={link.id}>
											<TableCell className="font-medium">
												{link.platformName || link.platformCode}
											</TableCell>
											<TableCell>
												<a
													href={link.url}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-primary hover:underline"
												>
													{link.url}
													<ExternalLink className="h-3 w-3" />
												</a>
											</TableCell>
											<TableCell>
												{link.isOfficial ? (
													<Badge variant="success">公式</Badge>
												) : (
													<span className="text-base-content/50">-</span>
												)}
											</TableCell>
											<TableCell>
												{link.isPrimary ? (
													<Badge variant="primary">メイン</Badge>
												) : (
													<span className="text-base-content/50">-</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
