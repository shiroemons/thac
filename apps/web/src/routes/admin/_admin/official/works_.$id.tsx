import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Home, Music, Pencil } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { OfficialLinksCard } from "@/components/admin/official-links-card";
import { OfficialWorkEditDialog } from "@/components/admin/official-work-edit-dialog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { officialSongsApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { officialWorkDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/official/works_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			officialWorkDetailQueryOptions(params.id),
		),
	head: ({ loaderData }) =>
		createPageHead(loaderData?.nameJa || loaderData?.name || "公式作品詳細"),
	component: OfficialWorkDetailPage,
});

// カテゴリコードから色を取得
const CATEGORY_COLORS: Record<string, BadgeVariant> = {
	pc98: "secondary",
	windows: "primary",
	zuns_music_collection: "accent",
	akyus_untouched_score: "info",
	commercial_books: "success",
	tasofro: "warning",
	other: "ghost",
};

function getCategoryColor(categoryCode: string | null): BadgeVariant {
	if (!categoryCode) return "ghost";
	return CATEGORY_COLORS[categoryCode] || "ghost";
}

function OfficialWorkDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	// 編集ダイアログ
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	// 作品データ取得（SSRデータをキャッシュとして活用）
	const {
		data: work,
		isPending,
		error,
	} = useQuery(officialWorkDetailQueryOptions(id));

	// 関連楽曲取得
	const { data: songsData } = useQuery({
		queryKey: ["officialSongs", { workId: id }],
		queryFn: () => officialSongsApi.list({ workId: id, limit: 100 }),
		staleTime: 30_000,
		enabled: !!work,
	});

	const songs = songsData?.data ?? [];

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialWorks", id] });
		queryClient.invalidateQueries({
			queryKey: ["officialSongs", { workId: id }],
		});
	};

	// ローディング（キャッシュがない場合のみスケルトンを表示）
	if (isPending && !work) {
		return <DetailPageSkeleton showBadge cardCount={3} fieldsPerCard={8} />;
	}

	// エラー・未存在
	if (error || !work) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>公式作品が見つかりません</span>
				</div>
				<Link to="/admin/official/works" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					公式作品一覧に戻る
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
						<Link to="/admin/official/works">公式作品管理</Link>
					</li>
					<li>{work.nameJa || work.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/official/works" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{work.nameJa || work.name}</h1>
					{work.categoryCode && (
						<Badge variant={getCategoryColor(work.categoryCode)}>
							{work.categoryCode}
						</Badge>
					)}
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsEditDialogOpen(true)}
				>
					<Pencil className="mr-2 h-4 w-4" />
					編集
				</Button>
			</div>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">ID</Label>
							<p className="font-mono text-sm">{work.id}</p>
						</div>
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p>{work.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">日本語名</Label>
							<p>{work.nameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">英語名</Label>
							<p>{work.nameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">短縮名</Label>
							<p>{work.shortNameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">短縮名（英語）</Label>
							<p>{work.shortNameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">カテゴリ</Label>
							<p>
								{work.categoryCode ? (
									<Badge variant={getCategoryColor(work.categoryCode)}>
										{work.categoryCode}
									</Badge>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">シリーズ番号</Label>
							<p>{work.numberInSeries ?? "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">発売日</Label>
							<p>
								{work.releaseDate
									? format(new Date(work.releaseDate), "yyyy年M月d日", {
											locale: ja,
										})
									: "-"}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">発行元</Label>
							<p>{work.officialOrganization || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順</Label>
							<p>{work.position ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">備考</Label>
							<p className="whitespace-pre-wrap">{work.notes || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 外部リンクカード */}
			<OfficialLinksCard entityType="work" entityId={id} />

			{/* 関連楽曲カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Music className="h-5 w-5" />
							関連楽曲
							<Badge variant="ghost">{songs.length}曲</Badge>
						</h2>
					</div>

					{songs.length === 0 ? (
						<p className="text-base-content/60">楽曲が登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th className="w-[60px]">No.</th>
										<th>楽曲名</th>
										<th className="w-[100px]">オリジナル</th>
									</tr>
								</thead>
								<tbody>
									{songs
										.sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
										.map((song) => (
											<tr key={song.id}>
												<td>{song.trackNumber ?? "-"}</td>
												<td>
													<Link
														to="/admin/official/songs/$id"
														params={{ id: song.id }}
														className="text-primary hover:underline"
													>
														{song.nameJa || song.name}
													</Link>
												</td>
												<td>
													{song.isOriginal ? (
														<Badge variant="outline">Yes</Badge>
													) : (
														<Badge variant="secondary">No</Badge>
													)}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* 編集ダイアログ */}
			<OfficialWorkEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				work={work}
				onSuccess={invalidateQuery}
			/>
		</div>
	);
}
