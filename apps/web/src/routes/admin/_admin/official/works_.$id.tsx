import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Music, Pencil } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { OfficialLinksCard } from "@/components/admin/official-links-card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getOfficialWork } from "@/functions/get-official-work";
import {
	type OfficialWork,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/official/works_/$id")({
	loader: ({ params }) => getOfficialWork(params.id),
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

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<OfficialWork>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 作品データ取得
	const {
		data: work,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["officialWorks", id],
		queryFn: () => officialWorksApi.get(id),
		staleTime: 30_000,
	});

	// カテゴリ一覧取得（編集用）
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list(),
		staleTime: 300_000,
		enabled: isEditing,
	});

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

	// 編集開始
	const startEditing = () => {
		if (work) {
			setEditForm({
				name: work.name,
				nameJa: work.nameJa,
				nameEn: work.nameEn,
				shortNameEn: work.shortNameEn,
				shortNameJa: work.shortNameJa,
				categoryCode: work.categoryCode,
				seriesCode: work.seriesCode,
				numberInSeries: work.numberInSeries,
				releaseDate: work.releaseDate,
				officialOrganization: work.officialOrganization,
				position: work.position,
				notes: work.notes,
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
			await officialWorksApi.update(id, {
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn ?? null,
				shortNameEn: editForm.shortNameEn ?? null,
				shortNameJa: editForm.shortNameJa ?? null,
				categoryCode: editForm.categoryCode,
				seriesCode: editForm.seriesCode ?? null,
				numberInSeries: editForm.numberInSeries,
				releaseDate: editForm.releaseDate ?? null,
				officialOrganization: editForm.officialOrganization ?? null,
				position: editForm.position,
				notes: editForm.notes ?? null,
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

	// ローディング
	if (isLoading) {
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
				{!isEditing && (
					<Button variant="outline" size="sm" onClick={startEditing}>
						<Pencil className="mr-2 h-4 w-4" />
						編集
					</Button>
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
								<Label>名前 *</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="例: Embodiment of Scarlet Devil"
								/>
							</div>
							<div className="form-control">
								<Label>日本語名</Label>
								<Input
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 東方紅魔郷"
								/>
							</div>
							<div className="form-control">
								<Label>英語名</Label>
								<Input
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="例: Embodiment of Scarlet Devil"
								/>
							</div>
							<div className="form-control">
								<Label>短縮名</Label>
								<Input
									value={editForm.shortNameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, shortNameJa: e.target.value })
									}
									placeholder="例: 紅魔郷"
								/>
							</div>
							<div className="form-control">
								<Label>短縮名（英語）</Label>
								<Input
									value={editForm.shortNameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, shortNameEn: e.target.value })
									}
									placeholder="例: EoSD"
								/>
							</div>
							<div className="form-control">
								<Label>カテゴリ</Label>
								<Select
									value={editForm.categoryCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, categoryCode: e.target.value })
									}
								>
									<option value="">選択なし</option>
									{categoriesData?.data.map((cat) => (
										<option key={cat.code} value={cat.code}>
											{cat.name}
										</option>
									))}
								</Select>
							</div>
							<div className="form-control">
								<Label>シリーズコード</Label>
								<Input
									value={editForm.seriesCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, seriesCode: e.target.value })
									}
									placeholder="例: th"
								/>
							</div>
							<div className="form-control">
								<Label>シリーズ番号</Label>
								<Input
									type="number"
									value={editForm.numberInSeries ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											numberInSeries: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 6"
								/>
							</div>
							<div className="form-control">
								<Label>発売日</Label>
								<Input
									type="date"
									value={editForm.releaseDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, releaseDate: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>発行元</Label>
								<Input
									value={editForm.officialOrganization || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											officialOrganization: e.target.value,
										})
									}
									placeholder="例: 上海アリス幻樂団"
								/>
							</div>
							<div className="form-control">
								<Label>表示順</Label>
								<Input
									type="number"
									value={editForm.position ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											position: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 1"
								/>
							</div>
							<div className="form-control md:col-span-2">
								<Label>備考</Label>
								<Textarea
									value={editForm.notes || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, notes: e.target.value })
									}
									placeholder="備考を入力"
									rows={3}
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
									disabled={isSubmitting}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						</div>
					) : (
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
								<Label className="text-base-content/60">シリーズ</Label>
								<p>
									{work.seriesCode
										? `${work.seriesCode}${work.numberInSeries ? ` #${work.numberInSeries}` : ""}`
										: "-"}
								</p>
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
					)}
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
		</div>
	);
}
