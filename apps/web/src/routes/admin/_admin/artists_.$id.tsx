import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Home,
	Music,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { ArtistAliasEditDialog } from "@/components/admin/artist-alias-edit-dialog";
import { ArtistEditDialog } from "@/components/admin/artist-edit-dialog";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
	type ArtistAlias,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createArtistDetailHead } from "@/lib/head";
import { artistAliasMutations, artistMutations } from "@/lib/mutation-options";
import { artistFullQueryOptions } from "@/lib/query-options";

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
		context.queryClient.ensureQueryData(artistFullQueryOptions(params.id)),
	head: ({ loaderData }) => createArtistDetailHead(loaderData?.artist?.name),
	component: ArtistDetailPage,
});

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isAliasDialogOpen, setIsAliasDialogOpen] = useState(false);
	const [editingAlias, setEditingAlias] = useState<ArtistAlias | null>(null);
	const [tracksPage, setTracksPage] = useState(1);

	// 削除ダイアログ状態
	const [deleteAliasTarget, setDeleteAliasTarget] =
		useState<ArtistAlias | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const tracksPageSize = 20;

	// Mutations
	const deleteMutation = useMutation(artistMutations.delete(queryClient));
	const deleteAliasMutation = useMutation(
		artistAliasMutations.delete(queryClient),
	);

	// 統合APIを使用して一括取得
	const { data: fullData, isPending } = useQuery(artistFullQueryOptions(id));

	// 統合レスポンスからデータを抽出
	const artist = fullData?.artist;
	const tracksData = fullData
		? {
				totalUniqueTrackCount: fullData.tracks.total,
				byRole: fullData.stats.byRole,
				tracks: fullData.tracks.data,
				statistics: {
					releaseCount: fullData.stats.releaseCount,
					earliestReleaseDate: fullData.stats.earliestReleaseDate,
					latestReleaseDate: fullData.stats.latestReleaseDate,
				},
			}
		: undefined;
	const circlesData = fullData?.circles;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artist", id, "full"] });
	};

	// 別名義削除
	const handleDeleteAlias = () => {
		if (!deleteAliasTarget) return;
		deleteAliasMutation.mutate(deleteAliasTarget.id, {
			onSuccess: () => setDeleteAliasTarget(null),
		});
	};

	// 別名義編集ダイアログを開く
	const handleEditAlias = (alias: ArtistAlias) => {
		setEditingAlias(alias);
		setIsAliasDialogOpen(true);
	};

	// 別名義新規作成ダイアログを開く
	const handleCreateAlias = () => {
		setEditingAlias(null);
		setIsAliasDialogOpen(true);
	};

	// アーティスト削除
	const handleDelete = () => {
		deleteMutation.mutate(id, {
			onSuccess: () => {
				setIsDeleteDialogOpen(false);
				navigate({ to: "/admin/artists" });
			},
		});
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
				<Link to="/admin/artists" className="btn btn-ghost mt-4 gap-1">
					<ArrowLeft className="h-4 w-4" />
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

			{/* エラーメッセージ */}
			{(deleteMutation.error || deleteAliasMutation.error) && (
				<Banner
					variant="error"
					onDismiss={() => {
						deleteMutation.reset();
						deleteAliasMutation.reset();
					}}
				>
					{deleteMutation.error instanceof Error
						? deleteMutation.error.message
						: deleteAliasMutation.error instanceof Error
							? deleteAliasMutation.error.message
							: "エラーが発生しました"}
				</Banner>
			)}

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
						className="gap-1"
						onClick={() => setIsEditDialogOpen(true)}
					>
						<Pencil className="h-4 w-4" />
						編集
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="gap-1 text-error hover:bg-error hover:text-error-content"
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						<Trash2 className="h-4 w-4" />
						削除
					</Button>
				</div>
			</div>

			{/* 基本情報カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/70">名前</Label>
							<p className="font-medium">{artist.name}</p>
						</div>
						<div>
							<Label className="text-base-content/70">日本語名</Label>
							<p>{artist.nameJa || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/70">英語名</Label>
							<p>{artist.nameEn || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/70">ソート用名</Label>
							<p>{artist.sortName || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/70">文字種</Label>
							<p>
								<Badge
									variant={INITIAL_SCRIPT_BADGE_VARIANTS[artist.initialScript]}
								>
									{INITIAL_SCRIPT_LABELS[artist.initialScript]}
								</Badge>
							</p>
						</div>
						<div>
							<Label className="text-base-content/70">頭文字</Label>
							<p className="font-mono">{artist.nameInitial || "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/70">備考</Label>
							<p className="whitespace-pre-wrap">{artist.notes || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 別名義一覧カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							別名義一覧
							{artist.aliases.length > 0 && (
								<Badge variant="secondary">{artist.aliases.length}件</Badge>
							)}
						</h2>
						<Button
							variant="primary"
							size="sm"
							className="gap-1"
							onClick={handleCreateAlias}
						>
							<Plus className="h-4 w-4" />
							別名義追加
						</Button>
					</div>

					{artist.aliases.length === 0 ? (
						<p className="text-base-content/70">別名義が登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>名前</TableHead>
										<TableHead className="w-[120px]">種類</TableHead>
										<TableHead className="w-[160px]">活動期間</TableHead>
										<TableHead className="w-[120px]">文字種</TableHead>
										<TableHead className="w-[100px]">頭文字</TableHead>
										<TableHead className="w-[80px]" />
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
											<TableCell className="text-base-content/70 text-sm">
												{alias.periodFrom || alias.periodTo
													? `${alias.periodFrom || "?"} 〜 ${alias.periodTo || "現在"}`
													: "-"}
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
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEditAlias(alias)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteAliasTarget(alias)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>

			{/* 統計情報カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title">統計情報</h2>

					{isPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !tracksData ? (
						<p className="text-base-content/70">統計情報を取得できません</p>
					) : (
						<div className="space-y-4">
							{/* 基本統計 */}
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/70">参加トラック数</Label>
									<p className="font-bold text-2xl">
										{tracksData.totalUniqueTrackCount}
										<span className="text-base-content/70 text-sm"> 曲</span>
									</p>
								</div>
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/70">参加作品数</Label>
									<p className="font-bold text-2xl">
										{tracksData.statistics.releaseCount}
										<span className="text-base-content/70 text-sm"> 作品</span>
									</p>
								</div>
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/70">活動期間</Label>
									<p className="font-medium">
										{tracksData.statistics.earliestReleaseDate &&
										tracksData.statistics.latestReleaseDate
											? `${tracksData.statistics.earliestReleaseDate} 〜 ${tracksData.statistics.latestReleaseDate}`
											: tracksData.statistics.earliestReleaseDate ||
												tracksData.statistics.latestReleaseDate ||
												"-"}
									</p>
								</div>
							</div>

							{/* 役割別内訳 */}
							{Object.keys(tracksData.byRole).length > 0 && (
								<div>
									<h3 className="mb-3 font-medium text-base-content/80">
										役割別内訳
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
							)}
						</div>
					)}
				</div>
			</div>

			{/* 参加サークルカード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						<h2 className="card-title">参加サークル</h2>
						{circlesData && circlesData.length > 0 && (
							<Badge variant="secondary">{circlesData.length}件</Badge>
						)}
					</div>

					{isPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !circlesData || circlesData.length === 0 ? (
						<p className="text-base-content/70">参加サークルがありません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>サークル名</TableHead>
										<TableHead className="w-[160px]">参加形態</TableHead>
										<TableHead className="w-[100px]">作品数</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{circlesData.map((circle) => (
										<TableRow key={circle.circleId}>
											<TableCell className="font-medium">
												<Link
													to="/admin/circles/$id"
													params={{ id: circle.circleId }}
													className="link link-hover"
												>
													{circle.circleName}
												</Link>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{circle.participationTypes.map((type) => (
														<Badge key={type} variant="outline">
															{type === "host"
																? "主催"
																: type === "contributor"
																	? "参加"
																	: type}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell className="text-base-content/70">
												{circle.releaseCount}作品
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
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<Music className="h-4 w-4" />
						<h2 className="card-title">関連楽曲</h2>
						{tracksData && (
							<Badge variant="secondary">
								{tracksData.totalUniqueTrackCount}曲
							</Badge>
						)}
					</div>

					{isPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !tracksData || tracksData.totalUniqueTrackCount === 0 ? (
						<p className="text-base-content/70">関連する楽曲がありません</p>
					) : (
						<div className="space-y-4">
							<div className="overflow-x-auto">
								<Table zebra>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead>作品</TableHead>
											<TableHead className="w-[60px]">No.</TableHead>
											<TableHead>トラック名</TableHead>
											<TableHead className="w-[120px]">頒布日</TableHead>
											<TableHead>サークル</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tracksData.tracks
											.slice(
												(tracksPage - 1) * tracksPageSize,
												tracksPage * tracksPageSize,
											)
											.map((track) => (
												<TableRow key={track.id}>
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
													<TableCell className="text-center text-base-content/70">
														{track.trackNumber}
													</TableCell>
													<TableCell className="font-medium">
														<Link
															to="/admin/tracks/$id"
															params={{ id: track.id }}
															className="link link-hover"
														>
															{track.name}
														</Link>
														{track.nameJa && track.nameJa !== track.name && (
															<span className="ml-2 text-base-content/70 text-sm">
																({track.nameJa})
															</span>
														)}
													</TableCell>
													<TableCell className="text-base-content/70">
														{track.release?.releaseDate || "-"}
													</TableCell>
													<TableCell className="text-base-content/70">
														{track.release?.circleNames || "-"}
													</TableCell>
												</TableRow>
											))}
									</TableBody>
								</Table>
							</div>

							{/* ページネーション */}
							{tracksData.tracks.length > tracksPageSize && (
								<div className="flex items-center justify-between">
									<p className="text-base-content/70 text-sm">
										全{tracksData.tracks.length}件中{" "}
										{(tracksPage - 1) * tracksPageSize + 1}〜
										{Math.min(
											tracksPage * tracksPageSize,
											tracksData.tracks.length,
										)}
										件を表示
									</p>
									<div className="join">
										<Button
											variant="outline"
											size="sm"
											className="join-item"
											disabled={tracksPage === 1}
											onClick={() => setTracksPage((p) => Math.max(1, p - 1))}
										>
											前へ
										</Button>
										<span className="join-item flex items-center border border-base-300 px-4 text-sm">
											{tracksPage} /{" "}
											{Math.ceil(tracksData.tracks.length / tracksPageSize)}
										</span>
										<Button
											variant="outline"
											size="sm"
											className="join-item"
											disabled={
												tracksPage >=
												Math.ceil(tracksData.tracks.length / tracksPageSize)
											}
											onClick={() =>
												setTracksPage((p) =>
													Math.min(
														Math.ceil(
															tracksData.tracks.length / tracksPageSize,
														),
														p + 1,
													),
												)
											}
										>
											次へ
										</Button>
									</div>
								</div>
							)}
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

			{/* 別名義編集ダイアログ */}
			<ArtistAliasEditDialog
				open={isAliasDialogOpen}
				onOpenChange={setIsAliasDialogOpen}
				mode={editingAlias ? "edit" : "create"}
				alias={editingAlias}
				artistId={id}
				onSuccess={invalidateQuery}
			/>

			{/* 別名義削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteAliasTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteAliasTarget(null);
						deleteAliasMutation.reset();
					}
				}}
				title="別名義の削除"
				description={
					<div>
						<p>「{deleteAliasTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDeleteAlias}
				isLoading={deleteAliasMutation.isPending}
			/>

			{/* アーティスト削除確認ダイアログ */}
			<ConfirmDialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) deleteMutation.reset();
				}}
				title="アーティストの削除"
				description={
					<div>
						<p>「{artist?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する別名義も削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
