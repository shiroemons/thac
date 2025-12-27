import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Music, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { ArtistAliasEditDialog } from "@/components/admin/artist-alias-edit-dialog";
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
	aliasTypesApi,
	artistAliasesApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createArtistAliasDetailHead } from "@/lib/head";
import {
	artistAliasCirclesQueryOptions,
	artistAliasDetailQueryOptions,
	artistAliasTracksQueryOptions,
} from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/artist-aliases_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			artistAliasDetailQueryOptions(params.id),
		),
	head: ({ loaderData }) => createArtistAliasDetailHead(loaderData?.name),
	component: ArtistAliasDetailPage,
});

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

// 名義種別に応じたBadgeのvariantを返す
const getAliasTypeBadgeVariant = (
	aliasTypeCode: string | null,
): "primary" | "info" | "accent" | "secondary" => {
	switch (aliasTypeCode) {
		case "main":
			return "primary";
		case "romanization":
			return "info";
		case "pseudonym":
			return "accent";
		default:
			return "secondary";
	}
};

function ArtistAliasDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [tracksPage, setTracksPage] = useState(1);
	const tracksPageSize = 20;

	const { data: alias, isPending } = useQuery(
		artistAliasDetailQueryOptions(id),
	);
	const { data: tracksData, isPending: isTracksPending } = useQuery(
		artistAliasTracksQueryOptions(id),
	);
	const { data: circlesData, isPending: isCirclesPending } = useQuery(
		artistAliasCirclesQueryOptions(id),
	);

	// 名義種別一覧取得
	const { data: aliasTypesData } = useQuery({
		queryKey: ["aliasTypes", "all"],
		queryFn: () => aliasTypesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artistAlias", id] });
		queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
	};

	// 削除
	const handleDelete = async () => {
		if (!confirm(`名義「${alias?.name}」を削除しますか？`)) {
			return;
		}
		try {
			await artistAliasesApi.delete(id);
			queryClient.invalidateQueries({ queryKey: ["artistAliases"] });
			navigate({ to: "/admin/artist-aliases" });
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	const aliasTypes = aliasTypesData?.data ?? [];

	// ローディング
	if (isPending && !alias) {
		return <DetailPageSkeleton cardCount={1} fieldsPerCard={8} />;
	}

	// エラー・未存在
	if (!alias) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>名義が見つかりません</span>
				</div>
				<Link to="/admin/artist-aliases" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					名義一覧に戻る
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
						<Link to="/admin/artist-aliases">アーティスト名義管理</Link>
					</li>
					<li>{alias.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/artist-aliases" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{alias.name}</h1>
					<Badge variant={INITIAL_SCRIPT_BADGE_VARIANTS[alias.initialScript]}>
						{INITIAL_SCRIPT_LABELS[alias.initialScript]}
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
							<Label className="text-base-content/60">名義名</Label>
							<p className="font-medium">{alias.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">アーティスト</Label>
							<p>
								{alias.artistName ? (
									<Link
										to="/admin/artists/$id"
										params={{ id: alias.artistId }}
										className="text-primary hover:underline"
									>
										{alias.artistName}
									</Link>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">名義種別</Label>
							<p>
								{alias.aliasTypeCode ? (
									<Badge
										variant={getAliasTypeBadgeVariant(alias.aliasTypeCode)}
									>
										{aliasTypes.find((t) => t.code === alias.aliasTypeCode)
											?.label || alias.aliasTypeCode}
									</Badge>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">文字種</Label>
							<p>
								<Badge
									variant={INITIAL_SCRIPT_BADGE_VARIANTS[alias.initialScript]}
								>
									{INITIAL_SCRIPT_LABELS[alias.initialScript]}
								</Badge>
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">頭文字</Label>
							<p className="font-mono">{alias.nameInitial || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">使用期間</Label>
							<p>
								{alias.periodFrom || alias.periodTo
									? `${alias.periodFrom || "?"} 〜 ${alias.periodTo || "現在"}`
									: "-"}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 統計情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">統計情報</h2>

					{isTracksPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !tracksData ? (
						<p className="text-base-content/60">統計情報を取得できません</p>
					) : (
						<div className="space-y-4">
							{/* 基本統計 */}
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/60">参加トラック数</Label>
									<p className="font-bold text-2xl">
										{tracksData.totalUniqueTrackCount}
										<span className="font-normal text-base-content/60 text-sm">
											{" "}
											曲
										</span>
									</p>
								</div>
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/60">参加リリース数</Label>
									<p className="font-bold text-2xl">
										{tracksData.statistics.releaseCount}
										<span className="font-normal text-base-content/60 text-sm">
											{" "}
											作品
										</span>
									</p>
								</div>
								<div className="rounded-lg bg-base-200/50 p-4">
									<Label className="text-base-content/60">活動期間</Label>
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
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						<h2 className="card-title">参加サークル</h2>
						{circlesData && circlesData.length > 0 && (
							<Badge variant="secondary">{circlesData.length}件</Badge>
						)}
					</div>

					{isCirclesPending ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : !circlesData || circlesData.length === 0 ? (
						<p className="text-base-content/60">参加サークルがありません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>サークル名</TableHead>
										<TableHead className="w-[160px]">参加形態</TableHead>
										<TableHead className="w-[100px]">リリース数</TableHead>
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
						<div className="space-y-4">
							<div className="overflow-x-auto">
								<Table zebra>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead>作品</TableHead>
											<TableHead className="w-[60px]">No.</TableHead>
											<TableHead>トラック名</TableHead>
											<TableHead className="w-[120px]">リリース日</TableHead>
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
															<span className="ml-2 text-base-content/60 text-sm">
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
									<p className="text-base-content/60 text-sm">
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
			<ArtistAliasEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				alias={alias}
				onSuccess={invalidateQuery}
			/>
		</div>
	);
}
