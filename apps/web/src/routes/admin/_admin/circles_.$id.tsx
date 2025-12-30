import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createId } from "@thac/db";
import {
	ArrowLeft,
	BarChart3,
	ExternalLink,
	Home,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CircleEditDialog } from "@/components/admin/circle-edit-dialog";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { GroupedSearchableSelect } from "@/components/ui/grouped-searchable-select";
import { Input } from "@/components/ui/input";
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
	type CircleLink,
	circleArtistsApi,
	circleLinksApi,
	circleReleasesApi,
	circlesApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
	PARTICIPATION_TYPE_COLORS,
	PARTICIPATION_TYPE_LABELS,
	platformsApi,
	RELEASE_TYPE_COLORS,
	RELEASE_TYPE_LABELS,
	type ReleaseType,
} from "@/lib/api-client";
import {
	PLATFORM_CATEGORY_LABELS,
	PLATFORM_CATEGORY_ORDER,
} from "@/lib/constants";
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
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 削除ダイアログ状態
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteLinkTarget, setDeleteLinkTarget] = useState<CircleLink | null>(
		null,
	);
	const [isDeletingLink, setIsDeletingLink] = useState(false);

	// 外部リンク管理用
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [editingLink, setEditingLink] = useState<CircleLink | null>(null);
	const [linkForm, setLinkForm] = useState<{
		platformCode: string;
		url: string;
		isOfficial: boolean;
		isPrimary: boolean;
	}>({
		platformCode: "",
		url: "",
		isOfficial: false,
		isPrimary: false,
	});

	const { data: circle, isPending } = useQuery(circleDetailQueryOptions(id));
	const { data: releasesByType } = useQuery({
		queryKey: ["circles", id, "releases"],
		queryFn: () => circleReleasesApi.list(id),
		enabled: !!circle,
	});

	const { data: artistsData, isPending: isArtistsPending } = useQuery({
		queryKey: ["circles", id, "artists"],
		queryFn: () => circleArtistsApi.list(id),
		enabled: !!circle,
	});

	// ページネーション用のstate
	const [artistsPage, setArtistsPage] = useState(1);
	const artistsPageSize = 20;

	// プラットフォーム一覧取得
	const { data: platformsData } = useQuery({
		queryKey: ["platforms"],
		queryFn: () => platformsApi.list({ limit: 100 }),
		staleTime: 300_000,
		enabled: isLinkDialogOpen,
	});

	// プラットフォームのグループ化オプション
	const platformOptions = useMemo(() => {
		const platforms = platformsData?.data ?? [];
		const sorted = [...platforms].sort(
			(a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
		);
		return sorted.map((p) => ({
			value: p.code,
			label: p.name,
			group: PLATFORM_CATEGORY_LABELS[p.category || "other"] || "その他",
		}));
	}, [platformsData?.data]);

	// プラットフォームのグループ順序
	const platformGroupOrder = useMemo(
		() => PLATFORM_CATEGORY_ORDER.map((key) => PLATFORM_CATEGORY_LABELS[key]),
		[],
	);

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["circles", id] });
		queryClient.invalidateQueries({ queryKey: ["circles", id, "releases"] });
		queryClient.invalidateQueries({ queryKey: ["circles", id, "artists"] });
	};

	// 役割ラベル
	const ROLE_LABELS: Record<string, string> = {
		vocal: "ボーカル",
		chorus: "コーラス",
		compose: "作曲",
		arrange: "編曲",
		lyrics: "作詞",
		instrument: "演奏",
		mix: "ミックス",
		master: "マスタリング",
		produce: "プロデュース",
		other: "その他",
	};

	// サークル削除
	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await circlesApi.delete(id);
			setIsDeleteDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ["circles"] });
			navigate({ to: "/admin/circles" });
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "削除に失敗しました",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	// 外部リンク関連
	const openLinkDialog = (link?: CircleLink) => {
		if (link) {
			setEditingLink(link);
			setLinkForm({
				platformCode: link.platformCode,
				url: link.url,
				isOfficial: link.isOfficial,
				isPrimary: link.isPrimary,
			});
		} else {
			setEditingLink(null);
			setLinkForm({
				platformCode: "",
				url: "",
				isOfficial: false,
				isPrimary: false,
			});
		}
		setIsLinkDialogOpen(true);
	};

	const handleLinkSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingLink) {
				await circleLinksApi.update(id, editingLink.id, {
					platformCode: linkForm.platformCode,
					url: linkForm.url,
					isOfficial: linkForm.isOfficial,
					isPrimary: linkForm.isPrimary,
				});
			} else {
				await circleLinksApi.create(id, {
					id: createId.circleLink(),
					platformCode: linkForm.platformCode,
					url: linkForm.url,
					platformId: null,
					handle: null,
					isOfficial: linkForm.isOfficial,
					isPrimary: linkForm.isPrimary,
				});
			}
			invalidateQuery();
			setIsLinkDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLinkDelete = async () => {
		if (!deleteLinkTarget) return;
		setIsDeletingLink(true);
		try {
			await circleLinksApi.delete(id, deleteLinkTarget.id);
			setDeleteLinkTarget(null);
			invalidateQuery();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "削除に失敗しました",
			);
		} finally {
			setIsDeletingLink(false);
		}
	};

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
						<Link to="/admin/circles">サークル管理</Link>
					</li>
					<li>{circle.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/circles" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{circle.name}</h1>
					<Badge variant={INITIAL_SCRIPT_BADGE_VARIANTS[circle.initialScript]}>
						{INITIAL_SCRIPT_LABELS[circle.initialScript]}
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
						onClick={() => setIsDeleteDialogOpen(true)}
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
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<ExternalLink className="h-5 w-5" />
							外部リンク一覧
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => openLinkDialog()}
						>
							<Plus className="mr-2 h-4 w-4" />
							リンク追加
						</Button>
					</div>

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
										<TableHead className="w-24">操作</TableHead>
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
													{link.url.length > 40
														? `${link.url.substring(0, 40)}...`
														: link.url}
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
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openLinkDialog(link)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteLinkTarget(link)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
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
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						<h2 className="card-title">統計情報</h2>
					</div>

					{isArtistsPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !artistsData ? (
						<p className="text-base-content/60">統計情報を取得できません</p>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
							<div className="rounded-lg bg-base-200/50 p-4">
								<Label className="text-base-content/60">参加作品数</Label>
								<p className="font-bold text-2xl">
									{artistsData.statistics.releaseCount}
									<span className="font-normal text-base-content/60 text-sm">
										{" "}
										作品
									</span>
								</p>
							</div>
							<div className="rounded-lg bg-base-200/50 p-4">
								<Label className="text-base-content/60">トラック総数</Label>
								<p className="font-bold text-2xl">
									{artistsData.statistics.totalTrackCount}
									<span className="font-normal text-base-content/60 text-sm">
										{" "}
										曲
									</span>
								</p>
							</div>
							<div className="rounded-lg bg-base-200/50 p-4">
								<Label className="text-base-content/60">
									参加アーティスト数
								</Label>
								<p className="font-bold text-2xl">
									{artistsData.statistics.totalArtistCount}
									<span className="font-normal text-base-content/60 text-sm">
										{" "}
										名
									</span>
								</p>
							</div>
							<div className="rounded-lg bg-base-200/50 p-4">
								<Label className="text-base-content/60">活動期間</Label>
								<p className="font-medium">
									{artistsData.statistics.earliestReleaseDate &&
									artistsData.statistics.latestReleaseDate
										? `${artistsData.statistics.earliestReleaseDate} 〜 ${artistsData.statistics.latestReleaseDate}`
										: artistsData.statistics.earliestReleaseDate ||
											artistsData.statistics.latestReleaseDate ||
											"-"}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* 参加アーティストカード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						<h2 className="card-title">参加アーティスト</h2>
						{artistsData && artistsData.artists.length > 0 && (
							<Badge variant="secondary">{artistsData.artists.length}名</Badge>
						)}
					</div>

					{isArtistsPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !artistsData || artistsData.artists.length === 0 ? (
						<p className="text-base-content/60">参加アーティストがいません</p>
					) : (
						<div className="space-y-4">
							<div className="overflow-x-auto">
								<Table zebra>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead>アーティスト名</TableHead>
											<TableHead className="w-[100px]">作品数</TableHead>
											<TableHead className="w-[100px]">トラック数</TableHead>
											<TableHead>役割</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{artistsData.artists
											.slice(
												(artistsPage - 1) * artistsPageSize,
												artistsPage * artistsPageSize,
											)
											.map((artist) => (
												<TableRow key={artist.artistId}>
													<TableCell className="font-medium">
														<Link
															to="/admin/artists/$id"
															params={{ id: artist.artistId }}
															className="link link-hover"
														>
															{artist.artistName}
														</Link>
													</TableCell>
													<TableCell className="text-base-content/70">
														{artist.releaseCount}作品
													</TableCell>
													<TableCell className="text-base-content/70">
														{artist.trackCount}曲
													</TableCell>
													<TableCell>
														<div className="flex flex-wrap gap-1">
															{artist.roles.map((role) => (
																<Badge key={role} variant="outline">
																	{ROLE_LABELS[role] || role}
																</Badge>
															))}
														</div>
													</TableCell>
												</TableRow>
											))}
									</TableBody>
								</Table>
							</div>

							{/* ページネーション */}
							{artistsData.artists.length > artistsPageSize && (
								<div className="flex items-center justify-center gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={artistsPage === 1}
										onClick={() => setArtistsPage((p) => p - 1)}
									>
										前へ
									</Button>
									<span className="text-base-content/60 text-sm">
										{artistsPage} /{" "}
										{Math.ceil(artistsData.artists.length / artistsPageSize)}
									</span>
									<Button
										variant="outline"
										size="sm"
										disabled={
											artistsPage >=
											Math.ceil(artistsData.artists.length / artistsPageSize)
										}
										onClick={() => setArtistsPage((p) => p + 1)}
									>
										次へ
									</Button>
								</div>
							)}
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

			{/* 外部リンク編集ダイアログ */}
			<Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>
							{editingLink ? "外部リンクの編集" : "外部リンクの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}

						<div className="grid gap-2">
							<Label>
								プラットフォーム <span className="text-error">*</span>
							</Label>
							<GroupedSearchableSelect
								value={linkForm.platformCode}
								onChange={(val) =>
									setLinkForm({
										...linkForm,
										platformCode: val,
									})
								}
								options={platformOptions}
								groupOrder={platformGroupOrder}
								placeholder="プラットフォームを選択"
								searchPlaceholder="プラットフォームを検索..."
								emptyMessage="プラットフォームが見つかりません"
								ungroupedLabel="その他"
							/>
						</div>

						<div className="grid gap-2">
							<Label>
								URL <span className="text-error">*</span>
							</Label>
							<Input
								type="url"
								value={linkForm.url}
								onChange={(e) =>
									setLinkForm({
										...linkForm,
										url: e.target.value,
									})
								}
								placeholder="https://..."
							/>
						</div>

						<div className="flex gap-6">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									className="checkbox"
									checked={linkForm.isOfficial}
									onChange={(e) =>
										setLinkForm({
											...linkForm,
											isOfficial: e.target.checked,
										})
									}
								/>
								<span>公式リンク</span>
							</label>

							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									className="checkbox"
									checked={linkForm.isPrimary}
									onChange={(e) =>
										setLinkForm({
											...linkForm,
											isPrimary: e.target.checked,
										})
									}
								/>
								<span>メインリンク</span>
							</label>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsLinkDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleLinkSubmit}
							disabled={isSubmitting || !linkForm.platformCode || !linkForm.url}
						>
							{isSubmitting
								? editingLink
									? "更新中..."
									: "追加中..."
								: editingLink
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<CircleEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				circle={circle}
				onSuccess={invalidateQuery}
			/>

			{/* サークル削除確認ダイアログ */}
			<ConfirmDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				title="サークルの削除"
				description={
					<div>
						<p>「{circle?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連するリリースやリンクも削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>

			{/* 外部リンク削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteLinkTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteLinkTarget(null);
				}}
				title="外部リンクの削除"
				description={
					<div>
						<p>
							「
							{deleteLinkTarget?.platformName || deleteLinkTarget?.platformCode}
							」の外部リンクを削除しますか？
						</p>
						<p className="mt-2 text-error text-sm">
							※この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleLinkDelete}
				isLoading={isDeletingLink}
			/>
		</div>
	);
}
