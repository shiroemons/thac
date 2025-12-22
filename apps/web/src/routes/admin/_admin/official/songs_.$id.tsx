import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { OfficialLinksCard } from "@/components/admin/official-links-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableGroupedSelect } from "@/components/ui/searchable-grouped-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getOfficialSong } from "@/functions/get-official-song";
import {
	type OfficialSong,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/official/songs_/$id")({
	loader: ({ params }) => getOfficialSong(params.id),
	head: ({ loaderData }) =>
		createPageHead(loaderData?.nameJa || loaderData?.name || "公式楽曲詳細"),
	component: OfficialSongDetailPage,
});

function OfficialSongDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<OfficialSong>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 楽曲データ取得
	const {
		data: song,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["officialSongs", id],
		queryFn: () => officialSongsApi.get(id),
		staleTime: 30_000,
	});

	// 作品一覧取得（編集用）
	const { data: worksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
		enabled: isEditing,
	});

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 300_000,
		enabled: isEditing,
	});

	// 楽曲一覧取得（原曲選択用）
	const { data: allSongsData } = useQuery({
		queryKey: ["officialSongs", "all"],
		queryFn: () => officialSongsApi.list({ limit: 5000 }),
		staleTime: 60_000,
		enabled: isEditing,
	});

	// 作品選択肢（カテゴリ別グループ）
	const workGroups = useMemo(() => {
		const works = worksData?.data ?? [];
		const categories = categoriesData?.data ?? [];

		const categoryMap = new Map(categories.map((c) => [c.code, c.name]));
		const grouped = new Map<string, { value: string; label: string }[]>();

		for (const w of works) {
			const categoryCode = w.categoryCode || "other";
			if (!grouped.has(categoryCode)) {
				grouped.set(categoryCode, []);
			}
			grouped.get(categoryCode)?.push({
				value: w.id,
				label: w.nameJa || w.name,
			});
		}

		const categoryOrder = [
			"pc98",
			"windows",
			"zuns_music_collection",
			"akyus_untouched_score",
			"commercial_books",
			"tasofro",
			"other",
		];

		return categoryOrder
			.filter((code) => grouped.has(code))
			.map((code) => ({
				label: categoryMap.get(code) || code,
				options: grouped.get(code) || [],
			}));
	}, [worksData, categoriesData]);

	// 原曲選択肢（自身を除外）
	const sourceSongOptions = useMemo(() => {
		return (allSongsData?.data ?? [])
			.filter((s) => s.id !== id)
			.map((s) => ({
				value: s.id,
				label: `${s.nameJa} (${s.workName || "作品なし"})`,
			}));
	}, [allSongsData, id]);

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialSongs", id] });
	};

	// 編集開始
	const startEditing = () => {
		if (song) {
			setEditForm({
				officialWorkId: song.officialWorkId,
				trackNumber: song.trackNumber,
				name: song.name,
				nameJa: song.nameJa,
				nameEn: song.nameEn,
				composerName: song.composerName,
				arrangerName: song.arrangerName,
				isOriginal: song.isOriginal,
				sourceSongId: song.sourceSongId,
				notes: song.notes,
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
		// 自己参照チェック
		if (editForm.sourceSongId === id) {
			setMutationError("自身を原曲に指定することはできません");
			return;
		}

		setIsSubmitting(true);
		setMutationError(null);
		try {
			await officialSongsApi.update(id, {
				officialWorkId: editForm.officialWorkId,
				trackNumber: editForm.trackNumber,
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				composerName: editForm.composerName,
				arrangerName: editForm.arrangerName,
				isOriginal: editForm.isOriginal,
				sourceSongId: editForm.isOriginal ? null : editForm.sourceSongId,
				notes: editForm.notes,
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
		return (
			<div className="container mx-auto p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-1/4 rounded bg-base-300" />
					<div className="h-64 rounded bg-base-300" />
				</div>
			</div>
		);
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
								<Label>作品</Label>
								<SearchableGroupedSelect
									value={editForm.officialWorkId || ""}
									onChange={(value) =>
										setEditForm({ ...editForm, officialWorkId: value || null })
									}
									groups={workGroups}
									placeholder="作品を選択"
									searchPlaceholder="作品名で検索..."
								/>
							</div>
							<div className="form-control">
								<Label>トラック番号</Label>
								<Input
									type="number"
									value={editForm.trackNumber ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											trackNumber: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 1"
								/>
							</div>
							<div className="form-control">
								<Label>名前 *</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="例: A Soul as Red as a Ground Cherry"
								/>
							</div>
							<div className="form-control">
								<Label>日本語名</Label>
								<Input
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 赤より紅い夢"
								/>
							</div>
							<div className="form-control">
								<Label>英語名</Label>
								<Input
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="例: A Soul as Red as a Ground Cherry"
								/>
							</div>
							<div className="form-control">
								<Label>作曲者名</Label>
								<Input
									value={editForm.composerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, composerName: e.target.value })
									}
									placeholder="例: ZUN"
								/>
							</div>
							<div className="form-control">
								<Label>編曲者名</Label>
								<Input
									value={editForm.arrangerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, arrangerName: e.target.value })
									}
									placeholder="例: ZUN"
								/>
							</div>
							<div className="form-control">
								<Label>オリジナル</Label>
								<Select
									value={editForm.isOriginal ? "true" : "false"}
									onChange={(e) => {
										const isOrig = e.target.value === "true";
										setEditForm({
											...editForm,
											isOriginal: isOrig,
											sourceSongId: isOrig ? null : editForm.sourceSongId,
										});
									}}
								>
									<option value="true">はい</option>
									<option value="false">いいえ</option>
								</Select>
							</div>
							{editForm.isOriginal === false && (
								<div className="form-control">
									<Label>原曲</Label>
									<SearchableSelect
										value={editForm.sourceSongId || ""}
										onChange={(value) =>
											setEditForm({ ...editForm, sourceSongId: value || null })
										}
										options={sourceSongOptions}
										placeholder="原曲を選択"
										searchPlaceholder="楽曲名で検索..."
									/>
								</div>
							)}
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
					)}
				</div>
			</div>

			{/* 外部リンクカード */}
			<OfficialLinksCard entityType="song" entityId={id} />
		</div>
	);
}
