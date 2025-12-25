import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { detectInitial } from "@thac/utils";
import { ArrowLeft, Music, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
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
	aliasTypesApi,
	artistAliasesApi,
	artistsApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
	type InitialScript,
} from "@/lib/api-client";
import { createArtistAliasDetailHead } from "@/lib/head";
import {
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

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

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

const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

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

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<ArtistAlias>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: alias, isPending } = useQuery(
		artistAliasDetailQueryOptions(id),
	);
	const { data: tracksData, isPending: isTracksPending } = useQuery(
		artistAliasTracksQueryOptions(id),
	);

	// アーティスト一覧取得
	const { data: artistsData } = useQuery({
		queryKey: ["artists", "all"],
		queryFn: () => artistsApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

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

	// 編集開始
	const startEditing = () => {
		if (alias) {
			setEditForm({
				artistId: alias.artistId,
				name: alias.name,
				aliasTypeCode: alias.aliasTypeCode,
				initialScript: alias.initialScript,
				nameInitial: alias.nameInitial,
				periodFrom: alias.periodFrom,
				periodTo: alias.periodTo,
			});
			setIsEditing(true);
		}
	};

	// 編集キャンセル
	const cancelEditing = () => {
		setIsEditing(false);
		setEditForm({});
		setMutationError(null);
	};

	// 保存
	const handleSave = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await artistAliasesApi.update(id, {
				artistId: editForm.artistId,
				name: editForm.name,
				aliasTypeCode: editForm.aliasTypeCode || null,
				initialScript: editForm.initialScript,
				nameInitial: editForm.nameInitial || null,
				periodFrom: editForm.periodFrom || null,
				periodTo: editForm.periodTo || null,
			});
			invalidateQuery();
			setIsEditing(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
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

	const artists = artistsData?.data ?? [];
	const aliasTypes = aliasTypesData?.data ?? [];

	// アーティストオプションを作成（現在のアーティストを含める）
	const artistFilterOptions = useMemo(() => {
		const options = artists.map((a) => ({
			value: a.id,
			label: a.name,
		}));
		// 現在のアーティストがリストにない場合は追加
		if (
			alias?.artistId &&
			alias?.artistName &&
			!options.find((o) => o.value === alias.artistId)
		) {
			options.unshift({ value: alias.artistId, label: alias.artistName });
		}
		return options;
	}, [artists, alias?.artistId, alias?.artistName]);

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
				{!isEditing && (
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={startEditing}>
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
				)}
			</div>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					{mutationError && (
						<div className="mb-4 rounded-md bg-error/10 p-3 text-error text-sm">
							{mutationError}
						</div>
					)}

					{isEditing ? (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="form-control">
								<Label>
									名義名 <span className="text-error">*</span>
								</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) => {
										const name = e.target.value;
										const initial = detectInitial(name);
										setEditForm({
											...editForm,
											name,
											initialScript: initial.initialScript as InitialScript,
											nameInitial: initial.nameInitial,
										});
									}}
									placeholder="名義名を入力"
								/>
							</div>
							<div className="form-control">
								<Label>
									アーティスト <span className="text-error">*</span>
								</Label>
								<SearchableSelect
									value={editForm.artistId || ""}
									onChange={(value) =>
										setEditForm({ ...editForm, artistId: value })
									}
									options={artistFilterOptions}
									placeholder="アーティストを選択"
									searchPlaceholder="アーティストを検索..."
									emptyMessage="該当するアーティストがありません"
									clearable={false}
								/>
							</div>
							<div className="form-control">
								<Label>名義種別</Label>
								<Select
									className="w-full"
									value={editForm.aliasTypeCode || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											aliasTypeCode: e.target.value || null,
										})
									}
								>
									<option value="">選択してください</option>
									{aliasTypes.map((t) => (
										<option key={t.code} value={t.code}>
											{t.label}
										</option>
									))}
								</Select>
							</div>
							<div className="form-control">
								<Label>
									頭文字の文字種 <span className="text-error">*</span>
								</Label>
								<Select
									className="w-full"
									value={editForm.initialScript || "latin"}
									onChange={(e) =>
										setEditForm({
											...editForm,
											initialScript: e.target.value as InitialScript,
											nameInitial: requiresInitial(e.target.value)
												? editForm.nameInitial
												: null,
										})
									}
								>
									{initialScriptOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="form-control">
								<Label>
									頭文字
									{requiresInitial(editForm.initialScript || "latin") && (
										<span className="text-error"> *</span>
									)}
								</Label>
								<Input
									value={editForm.nameInitial || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											nameInitial: e.target.value.slice(0, 1),
										})
									}
									maxLength={1}
									disabled={!requiresInitial(editForm.initialScript || "latin")}
									placeholder="頭文字を入力"
								/>
							</div>
							<div className="form-control">
								<Label>使用開始日</Label>
								<Input
									type="date"
									value={editForm.periodFrom || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											periodFrom: e.target.value || null,
										})
									}
								/>
							</div>
							<div className="form-control">
								<Label>使用終了日</Label>
								<Input
									type="date"
									value={editForm.periodTo || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											periodTo: e.target.value || null,
										})
									}
								/>
							</div>
							<div className="flex justify-end gap-2 md:col-span-2">
								<Button
									variant="ghost"
									onClick={cancelEditing}
									disabled={isSubmitting}
								>
									キャンセル
								</Button>
								<Button
									variant="primary"
									onClick={handleSave}
									disabled={
										isSubmitting || !editForm.name || !editForm.artistId
									}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						</div>
					) : (
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
												<TableHead className="w-[130px]">リリース日</TableHead>
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
		</div>
	);
}
