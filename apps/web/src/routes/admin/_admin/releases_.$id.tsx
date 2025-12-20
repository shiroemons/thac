import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Disc3,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	circlesApi,
	type Disc,
	discsApi,
	PARTICIPATION_TYPE_COLORS,
	PARTICIPATION_TYPE_LABELS,
	type ParticipationType,
	RELEASE_TYPE_COLORS,
	RELEASE_TYPE_LABELS,
	type Release,
	type ReleaseCircleWithCircle,
	type ReleaseType,
	releaseCirclesApi,
	releasesApi,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/releases_/$id")({
	component: ReleaseDetailPage,
});

// 作品タイプのオプション
const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_LABELS).map(
	([value, label]) => ({ value, label }),
);

// 参加形態のオプション
const PARTICIPATION_TYPE_OPTIONS = Object.entries(
	PARTICIPATION_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

function ReleaseDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Release>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ディスク編集用
	const [isDiscDialogOpen, setIsDiscDialogOpen] = useState(false);
	const [editingDisc, setEditingDisc] = useState<Disc | null>(null);
	const [discForm, setDiscForm] = useState<Partial<Disc>>({});

	// サークル選択ダイアログ用
	const [isCircleDialogOpen, setIsCircleDialogOpen] = useState(false);
	const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
	const [selectedParticipationType, setSelectedParticipationType] =
		useState<ParticipationType>("host");

	// 作品データ取得
	const {
		data: release,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["releases", id],
		queryFn: () => releasesApi.get(id),
		staleTime: 30_000,
	});

	// 関連サークル取得
	const { data: releaseCircles = [] } = useQuery({
		queryKey: ["releases", id, "circles"],
		queryFn: () => releaseCirclesApi.list(id),
		staleTime: 30_000,
		enabled: !!release,
	});

	// サークル一覧取得
	const { data: circlesData } = useQuery({
		queryKey: ["circles", { limit: 100 }],
		queryFn: () => circlesApi.list({ limit: 100 }),
		staleTime: 30_000,
		enabled: isCircleDialogOpen,
	});

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["releases", id] });
		queryClient.invalidateQueries({ queryKey: ["releases", id, "circles"] });
	};

	// 編集開始
	const startEditing = () => {
		if (release) {
			setEditForm({
				name: release.name,
				nameJa: release.nameJa,
				nameEn: release.nameEn,
				catalogNumber: release.catalogNumber,
				releaseDate: release.releaseDate,
				releaseType: release.releaseType,
				notes: release.notes,
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
			await releasesApi.update(id, {
				name: editForm.name,
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				catalogNumber: editForm.catalogNumber || null,
				releaseDate: editForm.releaseDate || null,
				releaseType: (editForm.releaseType as ReleaseType) || null,
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

	// ディスク関連
	const openDiscDialog = (disc?: Disc) => {
		if (disc) {
			setEditingDisc(disc);
			setDiscForm({
				discNumber: disc.discNumber,
				discName: disc.discName,
			});
		} else {
			setEditingDisc(null);
			const nextDiscNumber = release?.discs
				? Math.max(...release.discs.map((d) => d.discNumber), 0) + 1
				: 1;
			setDiscForm({ discNumber: nextDiscNumber, discName: null });
		}
		setIsDiscDialogOpen(true);
	};

	const handleDiscSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingDisc) {
				await discsApi.update(id, editingDisc.id, {
					discNumber: discForm.discNumber,
					discName: discForm.discName || null,
				});
			} else {
				await discsApi.create(id, {
					id: nanoid(),
					releaseId: id,
					discNumber: discForm.discNumber ?? 1,
					discName: discForm.discName || null,
				});
			}
			invalidateQuery();
			setIsDiscDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDiscDelete = async (disc: Disc) => {
		if (
			!confirm(
				`ディスク "${disc.discName || `Disc ${disc.discNumber}`}" を削除しますか？`,
			)
		) {
			return;
		}
		try {
			await discsApi.delete(id, disc.id);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// サークル関連
	const openCircleDialog = () => {
		setSelectedCircleId(null);
		setSelectedParticipationType("host");
		setIsCircleDialogOpen(true);
	};

	const handleCircleAdd = async () => {
		if (!selectedCircleId) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await releaseCirclesApi.add(id, {
				circleId: selectedCircleId,
				participationType: selectedParticipationType,
			});
			invalidateQuery();
			setIsCircleDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "追加に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCircleRemove = async (rc: ReleaseCircleWithCircle) => {
		if (!confirm(`サークル "${rc.circle.name}" の関連付けを解除しますか？`)) {
			return;
		}
		try {
			await releaseCirclesApi.remove(id, rc.circleId, rc.participationType);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	const handleCircleMoveUp = async (
		rc: ReleaseCircleWithCircle,
		index: number,
	) => {
		if (index === 0) return;
		const prevCircle = releaseCircles[index - 1];
		if (!prevCircle) return;

		try {
			// 順序を入れ替え
			await releaseCirclesApi.update(id, rc.circleId, rc.participationType, {
				position: prevCircle.position ?? index,
			});
			await releaseCirclesApi.update(
				id,
				prevCircle.circleId,
				prevCircle.participationType,
				{ position: rc.position ?? index + 1 },
			);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "順序変更に失敗しました");
		}
	};

	const handleCircleMoveDown = async (
		rc: ReleaseCircleWithCircle,
		index: number,
	) => {
		if (index === releaseCircles.length - 1) return;
		const nextCircle = releaseCircles[index + 1];
		if (!nextCircle) return;

		try {
			// 順序を入れ替え
			await releaseCirclesApi.update(id, rc.circleId, rc.participationType, {
				position: nextCircle.position ?? index + 2,
			});
			await releaseCirclesApi.update(
				id,
				nextCircle.circleId,
				nextCircle.participationType,
				{ position: rc.position ?? index + 1 },
			);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "順序変更に失敗しました");
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
	if (error || !release) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>作品が見つかりません</span>
				</div>
				<Link to="/admin/releases" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					作品一覧に戻る
				</Link>
			</div>
		);
	}

	// 既存サークルIDリスト（選択済み除外用）
	const existingCircleIds = releaseCircles.map((rc) => rc.circleId);
	const availableCircles =
		circlesData?.data.filter((c) => !existingCircleIds.includes(c.id)) ?? [];

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin/releases">作品管理</Link>
					</li>
					<li>{release.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/releases" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{release.name}</h1>
					{release.releaseType && (
						<Badge variant={RELEASE_TYPE_COLORS[release.releaseType]}>
							{RELEASE_TYPE_LABELS[release.releaseType]}
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
								<Label>作品名</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>日本語名</Label>
								<Input
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>英語名</Label>
								<Input
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>カタログ番号</Label>
								<Input
									value={editForm.catalogNumber || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, catalogNumber: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>タイプ</Label>
								<Select
									value={editForm.releaseType || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											releaseType: e.target.value as ReleaseType,
										})
									}
								>
									<option value="">選択してください</option>
									{RELEASE_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
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
							<div className="form-control md:col-span-2">
								<Label>メモ</Label>
								<Textarea
									value={editForm.notes || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, notes: e.target.value })
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
									disabled={isSubmitting}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label className="text-base-content/60">作品名</Label>
								<p>{release.name}</p>
							</div>
							<div>
								<Label className="text-base-content/60">日本語名</Label>
								<p>{release.nameJa || "-"}</p>
							</div>
							<div>
								<Label className="text-base-content/60">英語名</Label>
								<p>{release.nameEn || "-"}</p>
							</div>
							<div>
								<Label className="text-base-content/60">カタログ番号</Label>
								<p>{release.catalogNumber || "-"}</p>
							</div>
							<div>
								<Label className="text-base-content/60">タイプ</Label>
								<p>
									{release.releaseType
										? RELEASE_TYPE_LABELS[release.releaseType]
										: "-"}
								</p>
							</div>
							<div>
								<Label className="text-base-content/60">発売日</Label>
								<p>
									{release.releaseDate
										? format(new Date(release.releaseDate), "yyyy年M月d日", {
												locale: ja,
											})
										: "-"}
								</p>
							</div>
							<div className="md:col-span-2">
								<Label className="text-base-content/60">メモ</Label>
								<p className="whitespace-pre-wrap">{release.notes || "-"}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ディスク一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Disc3 className="h-5 w-5" />
							ディスク一覧
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => openDiscDialog()}
						>
							<Plus className="mr-2 h-4 w-4" />
							ディスク追加
						</Button>
					</div>

					{release.discs.length === 0 ? (
						<p className="text-base-content/60">ディスクが登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>ディスク番号</th>
										<th>ディスク名</th>
										<th className="w-24">操作</th>
									</tr>
								</thead>
								<tbody>
									{release.discs
										.sort((a, b) => a.discNumber - b.discNumber)
										.map((disc) => (
											<tr key={disc.id}>
												<td>Disc {disc.discNumber}</td>
												<td>{disc.discName || "-"}</td>
												<td>
													<div className="flex items-center gap-1">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => openDiscDialog(disc)}
														>
															<Pencil className="h-4 w-4" />
															<span className="sr-only">編集</span>
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="text-error hover:text-error"
															onClick={() => handleDiscDelete(disc)}
														>
															<Trash2 className="h-4 w-4" />
															<span className="sr-only">削除</span>
														</Button>
													</div>
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* サークル関連付けカード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Users className="h-5 w-5" />
							関連サークル
						</h2>
						<Button variant="outline" size="sm" onClick={openCircleDialog}>
							<Plus className="mr-2 h-4 w-4" />
							サークル追加
						</Button>
					</div>

					{releaseCircles.length === 0 ? (
						<p className="text-base-content/60">
							サークルが関連付けられていません
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th className="w-20">順序</th>
										<th>サークル名</th>
										<th>参加形態</th>
										<th className="w-32">操作</th>
									</tr>
								</thead>
								<tbody>
									{releaseCircles.map((rc, index) => (
										<tr key={`${rc.circleId}-${rc.participationType}`}>
											<td>{rc.position}</td>
											<td>{rc.circle.name}</td>
											<td>
												<Badge
													variant={
														PARTICIPATION_TYPE_COLORS[rc.participationType]
													}
												>
													{PARTICIPATION_TYPE_LABELS[rc.participationType]}
												</Badge>
											</td>
											<td>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCircleMoveUp(rc, index)}
														disabled={index === 0}
													>
														<ChevronUp className="h-4 w-4" />
														<span className="sr-only">上へ移動</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCircleMoveDown(rc, index)}
														disabled={index === releaseCircles.length - 1}
													>
														<ChevronDown className="h-4 w-4" />
														<span className="sr-only">下へ移動</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleCircleRemove(rc)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* ディスク編集ダイアログ */}
			<Dialog open={isDiscDialogOpen} onOpenChange={setIsDiscDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingDisc ? "ディスクの編集" : "ディスクの追加"}
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
								ディスク番号 <span className="text-error">*</span>
							</Label>
							<Input
								type="number"
								min={1}
								value={discForm.discNumber ?? ""}
								onChange={(e) =>
									setDiscForm({
										...discForm,
										discNumber: Number(e.target.value),
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label>ディスク名</Label>
							<Input
								value={discForm.discName || ""}
								onChange={(e) =>
									setDiscForm({ ...discForm, discName: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsDiscDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleDiscSubmit}
							disabled={isSubmitting}
						>
							{isSubmitting
								? editingDisc
									? "更新中..."
									: "追加中..."
								: editingDisc
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* サークル選択ダイアログ */}
			<Dialog open={isCircleDialogOpen} onOpenChange={setIsCircleDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>サークルの追加</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
						<div className="grid gap-2">
							<Label>
								サークル <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={selectedCircleId || ""}
								onChange={(value) => setSelectedCircleId(value || null)}
								options={availableCircles.map((circle) => ({
									value: circle.id,
									label: circle.name,
								}))}
								placeholder="選択してください"
								searchPlaceholder="サークルを検索..."
								emptyMessage="追加可能なサークルがありません"
								clearable={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label>参加形態</Label>
							<Select
								value={selectedParticipationType}
								onChange={(e) =>
									setSelectedParticipationType(
										e.target.value as ParticipationType,
									)
								}
							>
								{PARTICIPATION_TYPE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCircleDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCircleAdd}
							disabled={isSubmitting || !selectedCircleId}
						>
							{isSubmitting ? "追加中..." : "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
