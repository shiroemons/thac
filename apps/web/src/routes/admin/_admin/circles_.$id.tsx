import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
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
import {
	circleReleasesApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
	PARTICIPATION_TYPE_COLORS,
	PARTICIPATION_TYPE_LABELS,
	RELEASE_TYPE_COLORS,
	RELEASE_TYPE_LABELS,
	type ReleaseType,
} from "@/lib/api-client";
import { createCircleDetailHead } from "@/lib/head";
import { circleDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/circles_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(circleDetailQueryOptions(params.id)),
	head: ({ loaderData }) => createCircleDetailHead(loaderData?.name),
	component: CircleDetailPage,
});

function CircleDetailPage() {
	const { id } = Route.useParams();
	const { data: circle, isPending } = useQuery(circleDetailQueryOptions(id));
	const { data: releasesByType } = useQuery({
		queryKey: ["circles", id, "releases"],
		queryFn: () => circleReleasesApi.list(id),
		enabled: !!circle,
	});

	// ローディング
	if (isPending && !circle) {
		return <DetailPageSkeleton cardCount={2} fieldsPerCard={7} />;
	}

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

			{/* 参加形態別リリース一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">参加作品一覧</h2>

					{!releasesByType || releasesByType.length === 0 ? (
						<p className="text-base-content/60">参加作品が登録されていません</p>
					) : (
						<div className="space-y-6">
							{releasesByType.map((group) => (
								<div key={group.participationType}>
									<div className="mb-2 flex items-center gap-2">
										<Badge
											variant={
												PARTICIPATION_TYPE_COLORS[group.participationType]
											}
										>
											{PARTICIPATION_TYPE_LABELS[group.participationType]}
										</Badge>
										<span className="text-base-content/60 text-sm">
											({group.releases.length}件)
										</span>
									</div>
									<div className="overflow-x-auto">
										<Table zebra>
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead>作品名</TableHead>
													<TableHead className="w-[120px]">発売日</TableHead>
													<TableHead className="w-[100px]">タイプ</TableHead>
													<TableHead className="w-[150px]">
														カタログ番号
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{group.releases.map((release) => (
													<TableRow key={release.id}>
														<TableCell>
															<Link
																to="/admin/releases/$id"
																params={{ id: release.id }}
																className="text-primary hover:underline"
															>
																{release.name}
															</Link>
														</TableCell>
														<TableCell>{release.releaseDate || "-"}</TableCell>
														<TableCell>
															{release.releaseType ? (
																<Badge
																	variant={
																		RELEASE_TYPE_COLORS[
																			release.releaseType as ReleaseType
																		]
																	}
																>
																	{
																		RELEASE_TYPE_LABELS[
																			release.releaseType as ReleaseType
																		]
																	}
																</Badge>
															) : (
																"-"
															)}
														</TableCell>
														<TableCell>
															{release.catalogNumber || "-"}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
