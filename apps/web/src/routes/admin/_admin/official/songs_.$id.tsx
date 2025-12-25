import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Home, Pencil } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { OfficialLinksCard } from "@/components/admin/official-links-card";
import { OfficialSongEditDialog } from "@/components/admin/official-song-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createPageHead } from "@/lib/head";
import { officialSongDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/official/songs_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			officialSongDetailQueryOptions(params.id),
		),
	head: ({ loaderData }) =>
		createPageHead(loaderData?.nameJa || loaderData?.name || "公式楽曲詳細"),
	component: OfficialSongDetailPage,
});

function OfficialSongDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	// 編集ダイアログ
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	// 楽曲データ取得（SSRデータをキャッシュとして活用）
	const {
		data: song,
		isPending,
		error,
	} = useQuery(officialSongDetailQueryOptions(id));

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialSongs", id] });
	};

	// ローディング（キャッシュがない場合のみスケルトンを表示）
	if (isPending && !song) {
		return <DetailPageSkeleton showBadge cardCount={2} fieldsPerCard={8} />;
	}

	// エラー・未存在
	if (error || !song) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>公式楽曲が見つかりません</span>
				</div>
				<Link to="/admin/official/songs" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					公式楽曲一覧に戻る
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
						<Link to="/admin/official/songs">公式楽曲管理</Link>
					</li>
					<li>{song.nameJa || song.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/official/songs" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{song.nameJa || song.name}</h1>
					{song.isOriginal ? (
						<Badge variant="outline">オリジナル</Badge>
					) : (
						<Badge variant="secondary">アレンジ</Badge>
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
							<p className="font-mono text-sm">{song.id}</p>
						</div>
						<div>
							<Label className="text-base-content/60">作品</Label>
							<p>
								{song.workName && song.officialWorkId ? (
									<Link
										to="/admin/official/works/$id"
										params={{ id: song.officialWorkId }}
										className="text-primary hover:underline"
									>
										{song.workName}
									</Link>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">トラック番号</Label>
							<p>{song.trackNumber ?? "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p>{song.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">日本語名</Label>
							<p>{song.nameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">英語名</Label>
							<p>{song.nameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">作曲者名</Label>
							<p>{song.composerName || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">編曲者名</Label>
							<p>{song.arrangerName || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">オリジナル</Label>
							<p>
								{song.isOriginal ? (
									<Badge variant="outline">はい</Badge>
								) : (
									<Badge variant="secondary">いいえ</Badge>
								)}
							</p>
						</div>
						{!song.isOriginal && (
							<div>
								<Label className="text-base-content/60">原曲</Label>
								<p>
									{song.sourceSongId ? (
										<Link
											to="/admin/official/songs/$id"
											params={{ id: song.sourceSongId }}
											className="text-primary hover:underline"
										>
											{song.sourceSongName || song.sourceSongId}
										</Link>
									) : (
										"-"
									)}
								</p>
							</div>
						)}
						<div className="md:col-span-2">
							<Label className="text-base-content/60">備考</Label>
							<p className="whitespace-pre-wrap">{song.notes || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">作成日時</Label>
							<p>
								{format(new Date(song.createdAt), "yyyy年M月d日 HH:mm:ss", {
									locale: ja,
								})}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">更新日時</Label>
							<p>
								{format(new Date(song.updatedAt), "yyyy年M月d日 HH:mm:ss", {
									locale: ja,
								})}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 外部リンクカード */}
			<OfficialLinksCard entityType="song" entityId={id} />

			{/* 編集ダイアログ */}
			<OfficialSongEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				song={song}
				onSuccess={invalidateQuery}
			/>
		</div>
	);
}
