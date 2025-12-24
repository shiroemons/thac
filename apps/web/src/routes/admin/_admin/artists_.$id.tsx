import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
	type Artist,
	artistsApi,
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
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Artist>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: artist, isPending } = useQuery(artistDetailQueryOptions(id));

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artists", id] });
	};

	// 編集開始
	const startEditing = () => {
		if (artist) {
			setEditForm({
				name: artist.name,
				nameJa: artist.nameJa,
				nameEn: artist.nameEn,
				sortName: artist.sortName,
				notes: artist.notes,
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
			await artistsApi.update(id, {
				name: editForm.name,
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				sortName: editForm.sortName || null,
				notes: editForm.notes || null,
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
									名前 <span className="text-error">*</span>
								</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="アーティスト名を入力"
								/>
							</div>
							<div className="form-control">
								<Label>日本語名</Label>
								<Input
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="日本語名を入力"
								/>
							</div>
							<div className="form-control">
								<Label>英語名</Label>
								<Input
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="英語名を入力"
								/>
							</div>
							<div className="form-control">
								<Label>ソート用名</Label>
								<Input
									value={editForm.sortName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, sortName: e.target.value })
									}
									placeholder="ソート用の名前を入力"
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
									disabled={isSubmitting || !editForm.name}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						</div>
					) : (
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
										variant={
											INITIAL_SCRIPT_BADGE_VARIANTS[artist.initialScript]
										}
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
					)}
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
