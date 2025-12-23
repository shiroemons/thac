import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createArtistDetailHead } from "@/lib/head";
import { artistDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/artists_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(artistDetailQueryOptions(params.id)),
	head: ({ loaderData }) => createArtistDetailHead(loaderData?.name),
	component: ArtistDetailPage,
});

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const { data: artist, isPending } = useQuery(artistDetailQueryOptions(id));

	// ローディング
	if (isPending && !artist) {
		return <DetailPageSkeleton cardCount={2} fieldsPerCard={7} />;
	}

	// エラー・未存在
	if (!artist) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>アーティストが見つかりません</span>
				</div>
				<Link to="/admin/artists" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					アーティスト一覧に戻る
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="アーティスト詳細"
				breadcrumbs={[
					{ label: "アーティスト", href: "/admin/artists" },
					{ label: artist.name },
				]}
			/>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{artist.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">日本語名</Label>
							<p>{artist.nameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">英語名</Label>
							<p>{artist.nameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">ソート用名</Label>
							<p>{artist.sortName || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">文字種</Label>
							<p>
								<Badge
									variant={INITIAL_SCRIPT_BADGE_VARIANTS[artist.initialScript]}
								>
									{INITIAL_SCRIPT_LABELS[artist.initialScript]}
								</Badge>
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">頭文字</Label>
							<p className="font-mono">{artist.nameInitial || "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">備考</Label>
							<p className="whitespace-pre-wrap">{artist.notes || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 別名義一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">別名義一覧</h2>

					{artist.aliases.length === 0 ? (
						<p className="text-base-content/60">別名義が登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>名前</TableHead>
										<TableHead className="w-[120px]">種類</TableHead>
										<TableHead className="w-[120px]">文字種</TableHead>
										<TableHead className="w-[100px]">頭文字</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{artist.aliases.map((alias) => (
										<TableRow key={alias.id}>
											<TableCell className="font-medium">
												{alias.name}
											</TableCell>
											<TableCell className="text-base-content/70">
												{alias.aliasTypeCode || "-"}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														INITIAL_SCRIPT_BADGE_VARIANTS[alias.initialScript]
													}
												>
													{INITIAL_SCRIPT_LABELS[alias.initialScript]}
												</Badge>
											</TableCell>
											<TableCell className="font-mono">
												{alias.nameInitial || "-"}
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
