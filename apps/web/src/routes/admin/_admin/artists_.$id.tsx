import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Music, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ArtistEditDialog } from "@/components/admin/artist-edit-dialog";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	artistsApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createArtistDetailHead } from "@/lib/head";
import {
	artistDetailQueryOptions,
	artistTracksQueryOptions,
} from "@/lib/query-options";

/** 役割コードのラベルマップ */
const ROLE_LABELS: Record<string, string> = {
	vocal: "ボーカル",
	arrange: "編曲",
	lyrics: "作詞",
	compose: "作曲",
	circle: "サークル",
	guitar: "ギター",
	bass: "ベース",
	drums: "ドラム",
	piano: "ピアノ",
	strings: "ストリングス",
	chorus: "コーラス",
	mix: "ミックス",
	mastering: "マスタリング",
	illustration: "イラスト",
	movie: "動画",
	other: "その他",
};

export const Route = createFileRoute("/admin/_admin/artists_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(artistDetailQueryOptions(params.id)),
	head: ({ loaderData }) => createArtistDetailHead(loaderData?.name),
	component: ArtistDetailPage,
});

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const { data: artist, isPending } = useQuery(artistDetailQueryOptions(id));
	const { data: tracksData, isPending: isTracksPending } = useQuery(
		artistTracksQueryOptions(id),
	);

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artists", id] });
	};

	// アーティスト削除
	const handleDelete = async () => {
		if (!confirm(`アーティスト「${artist?.name}」を削除しますか？`)) {
			return;
		}
		try {
			await artistsApi.delete(id);
			queryClient.invalidateQueries({ queryKey: ["artists"] });
			navigate({ to: "/admin/artists" });
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

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
						<Link to="/admin/artists">アーティスト管理</Link>
					</li>
					<li>{artist.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/artists" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{artist.name}</h1>
					<Badge variant={INITIAL_SCRIPT_BADGE_VARIANTS[artist.initialScript]}>
						{INITIAL_SCRIPT_LABELS[artist.initialScript]}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditDialogOpen(true)}
					>
						<Pencil className="mr-2 h-4 w-4" />
						編集
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-error hover:bg-error hover:text-error-content"
						onClick={handleDelete}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						削除
					</Button>
				</div>
			</div>

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

			{/* 関連楽曲カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<Music className="h-5 w-5" />
						<h2 className="card-title">関連楽曲</h2>
						{tracksData && (
							<Badge variant="secondary">
								{tracksData.totalUniqueTrackCount}曲
							</Badge>
						)}
					</div>

					{isTracksPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !tracksData || tracksData.totalUniqueTrackCount === 0 ? (
						<p className="text-base-content/60">関連する楽曲がありません</p>
					) : (
						<div className="space-y-6">
							{/* 役割別カウント */}
							<div>
								<h3 className="mb-3 font-medium text-base-content/80">
									役割別カウント
								</h3>
								<div className="flex flex-wrap gap-2">
									{Object.entries(tracksData.byRole)
										.sort((a, b) => b[1] - a[1])
										.map(([roleCode, count]) => (
											<Badge key={roleCode} variant="outline">
												{ROLE_LABELS[roleCode] || roleCode}: {count}曲
											</Badge>
										))}
								</div>
							</div>

							{/* 楽曲一覧 */}
							<div>
								<h3 className="mb-3 font-medium text-base-content/80">
									楽曲一覧
								</h3>
								<div className="overflow-x-auto">
									<Table zebra>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead>楽曲名</TableHead>
												<TableHead>リリース</TableHead>
												<TableHead className="w-[120px]">リリース日</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{tracksData.tracks.map((track) => (
												<TableRow key={track.id}>
													<TableCell className="font-medium">
														<Link
															to="/admin/tracks/$id"
															params={{ id: track.id }}
															className="link link-hover"
														>
															{track.name}
														</Link>
														{track.nameJa && track.nameJa !== track.name && (
															<span className="ml-2 text-base-content/60 text-sm">
																({track.nameJa})
															</span>
														)}
													</TableCell>
													<TableCell>
														{track.release ? (
															<Link
																to="/admin/releases/$id"
																params={{ id: track.release.id }}
																className="link link-hover"
															>
																{track.release.name}
															</Link>
														) : (
															"-"
														)}
													</TableCell>
													<TableCell className="text-base-content/70">
														{track.release?.releaseDate || "-"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* 編集ダイアログ */}
			<ArtistEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				artist={artist}
				onSuccess={invalidateQuery}
			/>
		</div>
	);
}
