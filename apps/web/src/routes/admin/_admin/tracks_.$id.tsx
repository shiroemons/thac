import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
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
} from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	artistAliasesApi,
	artistsApi,
	creditRolesApi,
	type Track,
	type TrackCredit,
	trackCreditsApi,
	tracksApi,
} from "@/lib/api-client";
import { createTrackDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/tracks_/$id")({
	loader: ({ params }) => tracksApi.get(params.id),
	head: ({ loaderData }) =>
		createTrackDetailHead(loaderData?.name, loaderData?.release?.name),
	component: TrackDetailPage,
});

// 役割コードに基づいて色を決定するヘルパー
const ROLE_COLORS = [
	"primary",
	"secondary",
	"accent",
	"info",
	"success",
	"warning",
] as const;

function getRoleBadgeVariant(
	roleCode: string,
): "primary" | "secondary" | "accent" | "info" | "success" | "warning" {
	// 役割コードのハッシュ値から色を決定
	let hash = 0;
	for (let i = 0; i < roleCode.length; i++) {
		hash = roleCode.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % ROLE_COLORS.length;
	return ROLE_COLORS[index];
}

function TrackDetailPage() {
	const { id: trackId } = Route.useParams();
	const queryClient = useQueryClient();

	// トラック詳細取得
	const {
		data: track,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["track", trackId],
		queryFn: () => tracksApi.get(trackId),
	});

	// 編集関連の状態
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Track>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// クレジット追加ダイアログ
	const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
	const [creditForm, setCreditForm] = useState({
		id: "",
		artistId: "",
		artistAliasId: "",
		creditName: "",
		creditPosition: 1,
		selectedRoles: [] as string[],
	});

	// クレジット編集ダイアログ
	const [editingCredit, setEditingCredit] = useState<TrackCredit | null>(null);
	const [isCreditEditDialogOpen, setIsCreditEditDialogOpen] = useState(false);

	// アーティスト・別名義・役割データ取得
	const { data: artistsData } = useQuery({
		queryKey: ["artists", { limit: 200 }],
		queryFn: () => artistsApi.list({ limit: 200 }),
		staleTime: 60_000,
	});

	const { data: allAliasesData } = useQuery({
		queryKey: ["artist-aliases-all", { limit: 500 }],
		queryFn: () => artistAliasesApi.list({ limit: 500 }),
		staleTime: 60_000,
	});

	const { data: creditRolesData } = useQuery({
		queryKey: ["credit-roles"],
		queryFn: () => creditRolesApi.list(),
		staleTime: 60_000,
	});

	// アーティスト名義のオプションを構築（別名義のみ）
	const creditNameOptions = (() => {
		const options: Array<{
			value: string;
			label: string;
			artistId: string;
			artistAliasId: string;
			creditName: string;
		}> = [];

		// 別名義のみを追加
		for (const alias of allAliasesData?.data ?? []) {
			options.push({
				value: alias.id,
				label: alias.name,
				artistId: alias.artistId,
				artistAliasId: alias.id,
				creditName: alias.name,
			});
		}

		// 名前でソート
		return options.sort((a, b) => a.label.localeCompare(b.label, "ja"));
	})();

	// 編集開始
	const startEditing = () => {
		if (!track) return;
		setEditForm({
			name: track.name,
			nameJa: track.nameJa,
			nameEn: track.nameEn,
			trackNumber: track.trackNumber,
		});
		setIsEditing(true);
		setMutationError(null);
	};

	// 編集キャンセル
	const cancelEditing = () => {
		setIsEditing(false);
		setEditForm({});
		setMutationError(null);
	};

	// 保存
	const handleSave = async () => {
		if (!track) return;
		setIsSubmitting(true);
		setMutationError(null);

		try {
			await tracksApi.update(track.releaseId, track.id, {
				name: editForm.name ?? "",
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				trackNumber: editForm.trackNumber,
			});
			await queryClient.invalidateQueries({ queryKey: ["track", trackId] });
			setIsEditing(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// クレジット追加ダイアログを開く
	const openCreditDialog = () => {
		const maxPosition = Math.max(
			0,
			...(track?.credits.map((c) => c.creditPosition) ?? []),
		);
		setCreditForm({
			id: createId.trackCredit(),
			artistId: "",
			artistAliasId: "",
			creditName: "",
			creditPosition: maxPosition + 1,
			selectedRoles: [],
		});
		setIsCreditDialogOpen(true);
		setMutationError(null);
	};

	// クレジット追加ダイアログを閉じる
	const closeCreditDialog = () => {
		setIsCreditDialogOpen(false);
		setCreditForm({
			id: "",
			artistId: "",
			artistAliasId: "",
			creditName: "",
			creditPosition: 1,
			selectedRoles: [],
		});
	};

	// クレジット編集ダイアログを開く
	const openCreditEditDialog = (credit: TrackCredit) => {
		setEditingCredit(credit);
		setCreditForm({
			id: credit.id,
			artistId: credit.artistId,
			artistAliasId: credit.artistAliasId ?? "",
			creditName: credit.creditName,
			creditPosition: credit.creditPosition,
			selectedRoles: credit.roles?.map((r) => r.roleCode) ?? [],
		});
		setIsCreditEditDialogOpen(true);
		setMutationError(null);
	};

	// クレジット編集ダイアログを閉じる
	const closeCreditEditDialog = () => {
		setIsCreditEditDialogOpen(false);
		setEditingCredit(null);
		setCreditForm({
			id: "",
			artistId: "",
			artistAliasId: "",
			creditName: "",
			creditPosition: 1,
			selectedRoles: [],
		});
	};

	// アーティスト名義選択時
	const handleCreditNameOptionChange = (optionValue: string) => {
		const option = creditNameOptions.find((o) => o.value === optionValue);
		if (option) {
			setCreditForm({
				...creditForm,
				artistId: option.artistId,
				artistAliasId: option.artistAliasId,
				creditName: option.creditName,
			});
		} else {
			// クリア時
			setCreditForm({
				...creditForm,
				artistId: "",
				artistAliasId: "",
				creditName: "",
			});
		}
	};

	// 現在の選択値を取得（artistAliasIdをそのまま使用）
	const getCurrentCreditNameOptionValue = () => {
		return creditForm.artistAliasId || "";
	};

	// 役割トグル
	const handleRoleToggle = (roleCode: string) => {
		setCreditForm((prev) => ({
			...prev,
			selectedRoles: prev.selectedRoles.includes(roleCode)
				? prev.selectedRoles.filter((r) => r !== roleCode)
				: [...prev.selectedRoles, roleCode],
		}));
	};

	// クレジット追加・更新
	const handleCreditSubmit = async () => {
		if (!track) return;
		setIsSubmitting(true);
		setMutationError(null);

		try {
			if (editingCredit) {
				await trackCreditsApi.update(
					track.releaseId,
					track.id,
					editingCredit.id,
					{
						artistId: creditForm.artistId,
						artistAliasId: creditForm.artistAliasId || null,
						creditName: creditForm.creditName,
						creditPosition: creditForm.creditPosition,
						rolesCodes: creditForm.selectedRoles,
					},
				);
				closeCreditEditDialog();
			} else {
				await trackCreditsApi.create(track.releaseId, track.id, {
					id: creditForm.id,
					artistId: creditForm.artistId,
					artistAliasId: creditForm.artistAliasId || null,
					creditName: creditForm.creditName,
					creditPosition: creditForm.creditPosition,
					rolesCodes: creditForm.selectedRoles,
				});
				closeCreditDialog();
			}
			await queryClient.invalidateQueries({ queryKey: ["track", trackId] });
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "クレジットの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// クレジット削除
	const handleCreditDelete = async (credit: TrackCredit) => {
		if (!track) return;
		if (!confirm(`クレジット "${credit.creditName}" を削除しますか？`)) {
			return;
		}

		try {
			await trackCreditsApi.delete(track.releaseId, track.id, credit.id);
			await queryClient.invalidateQueries({ queryKey: ["track", trackId] });
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "クレジットの削除に失敗しました",
			);
		}
	};

	// クレジット順序変更（上へ）
	const handleCreditMoveUp = async (credit: TrackCredit, index: number) => {
		if (!track || index === 0) return;
		const sortedCredits = [...track.credits].sort(
			(a, b) => a.creditPosition - b.creditPosition,
		);
		const prevCredit = sortedCredits[index - 1];

		try {
			await Promise.all([
				trackCreditsApi.update(track.releaseId, track.id, credit.id, {
					creditPosition: prevCredit.creditPosition,
				}),
				trackCreditsApi.update(track.releaseId, track.id, prevCredit.id, {
					creditPosition: credit.creditPosition,
				}),
			]);
			await queryClient.invalidateQueries({ queryKey: ["track", trackId] });
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "順序変更に失敗しました",
			);
		}
	};

	// クレジット順序変更（下へ）
	const handleCreditMoveDown = async (credit: TrackCredit, index: number) => {
		if (!track) return;
		const sortedCredits = [...track.credits].sort(
			(a, b) => a.creditPosition - b.creditPosition,
		);
		if (index === sortedCredits.length - 1) return;
		const nextCredit = sortedCredits[index + 1];

		try {
			await Promise.all([
				trackCreditsApi.update(track.releaseId, track.id, credit.id, {
					creditPosition: nextCredit.creditPosition,
				}),
				trackCreditsApi.update(track.releaseId, track.id, nextCredit.id, {
					creditPosition: credit.creditPosition,
				}),
			]);
			await queryClient.invalidateQueries({ queryKey: ["track", trackId] });
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "順序変更に失敗しました",
			);
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			</div>
		);
	}

	if (error || !track) {
		return (
			<div className="container mx-auto py-6">
				<div className="alert alert-error">
					{error instanceof Error ? error.message : "トラックが見つかりません"}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="トラック詳細"
				breadcrumbs={[
					{ label: "トラック", href: "/admin/tracks" },
					{ label: track.name },
				]}
			/>

			{mutationError && (
				<div className="alert alert-error mb-4">{mutationError}</div>
			)}

			{/* トラック情報カード */}
			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="border-base-300 border-b p-4">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-xl">{track.name}</h2>
						{!isEditing ? (
							<Button variant="outline" size="sm" onClick={startEditing}>
								<Pencil className="mr-1 h-4 w-4" />
								編集
							</Button>
						) : (
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={cancelEditing}
									disabled={isSubmitting}
								>
									キャンセル
								</Button>
								<Button
									variant="primary"
									size="sm"
									onClick={handleSave}
									disabled={isSubmitting || !editForm.name}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						)}
					</div>
				</div>

				<div className="p-4">
					{isEditing ? (
						<div className="grid gap-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="name">
										トラック名 <span className="text-error">*</span>
									</Label>
									<Input
										id="name"
										value={editForm.name || ""}
										onChange={(e) =>
											setEditForm({ ...editForm, name: e.target.value })
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="trackNumber">
										トラック番号 <span className="text-error">*</span>
									</Label>
									<Input
										id="trackNumber"
										type="number"
										min="1"
										value={editForm.trackNumber || ""}
										onChange={(e) =>
											setEditForm({
												...editForm,
												trackNumber: Number.parseInt(e.target.value, 10) || 1,
											})
										}
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="nameJa">日本語名</Label>
									<Input
										id="nameJa"
										value={editForm.nameJa || ""}
										onChange={(e) =>
											setEditForm({ ...editForm, nameJa: e.target.value })
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="nameEn">英語名</Label>
									<Input
										id="nameEn"
										value={editForm.nameEn || ""}
										onChange={(e) =>
											setEditForm({ ...editForm, nameEn: e.target.value })
										}
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="grid gap-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div>
									<p className="text-base-content/60 text-sm">トラック名</p>
									<p>{track.name}</p>
								</div>
								<div>
									<p className="text-base-content/60 text-sm">トラック番号</p>
									<p>{track.trackNumber}</p>
								</div>
								<div>
									<p className="text-base-content/60 text-sm">日本語名</p>
									<p>{track.nameJa || "-"}</p>
								</div>
								<div>
									<p className="text-base-content/60 text-sm">英語名</p>
									<p>{track.nameEn || "-"}</p>
								</div>
							</div>

							<div className="border-base-300 border-t pt-4">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
									<div>
										<p className="text-base-content/60 text-sm">作品</p>
										{track.release ? (
											<Link
												to="/admin/releases/$id"
												params={{ id: track.release.id }}
												className="text-primary hover:underline"
											>
												{track.release.name}
											</Link>
										) : (
											<p>-</p>
										)}
									</div>
									<div>
										<p className="text-base-content/60 text-sm">ディスク</p>
										<p>
											{track.disc
												? `Disc ${track.disc.discNumber}${track.disc.discName ? ` - ${track.disc.discName}` : ""}`
												: "-"}
										</p>
									</div>
									<div>
										<p className="text-base-content/60 text-sm">作成日時</p>
										<p className="text-sm">
											{format(
												new Date(track.createdAt),
												"yyyy/MM/dd HH:mm:ss",
												{
													locale: ja,
												},
											)}
										</p>
									</div>
									<div>
										<p className="text-base-content/60 text-sm">更新日時</p>
										<p className="text-sm">
											{format(
												new Date(track.updatedAt),
												"yyyy/MM/dd HH:mm:ss",
												{
													locale: ja,
												},
											)}
										</p>
									</div>
								</div>
							</div>

							<div className="border-base-300 border-t pt-4">
								<p className="text-base-content/60 text-sm">ID</p>
								<p className="font-mono text-xs">{track.id}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* クレジット一覧 */}
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">クレジット</h2>
					<Button variant="outline" size="sm" onClick={openCreditDialog}>
						<Plus className="mr-2 h-4 w-4" />
						クレジット追加
					</Button>
				</div>

				<div className="p-4">
					{track.credits.length === 0 ? (
						<p className="py-8 text-center text-base-content/50">
							クレジットが登録されていません
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[100px]">並び替え</TableHead>
									<TableHead>アーティスト</TableHead>
									<TableHead>名義</TableHead>
									<TableHead>盤面表記</TableHead>
									<TableHead>役割</TableHead>
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{track.credits
									.sort((a, b) => a.creditPosition - b.creditPosition)
									.map((credit, index) => (
										<TableRow key={credit.id}>
											<TableCell className="w-[100px]">
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCreditMoveUp(credit, index)}
														disabled={index === 0}
														title="上へ移動"
													>
														<ChevronUp className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCreditMoveDown(credit, index)}
														disabled={index === track.credits.length - 1}
														title="下へ移動"
													>
														<ChevronDown className="h-4 w-4" />
													</Button>
													<span className="ml-1 text-base-content/70">
														{credit.creditPosition}
													</span>
												</div>
											</TableCell>
											<TableCell>
												{credit.artist ? (
													<Link
														to="/admin/artists"
														search={{ search: credit.artist.name }}
														className="text-primary hover:underline"
													>
														{credit.artist.name}
													</Link>
												) : (
													"-"
												)}
											</TableCell>
											<TableCell>{credit.artistAlias?.name || "-"}</TableCell>
											<TableCell className="font-medium">
												{credit.creditName}
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{credit.roles && credit.roles.length > 0 ? (
														credit.roles
															.sort((a, b) => a.rolePosition - b.rolePosition)
															.map((role) => (
																<Badge
																	key={`${role.roleCode}-${role.rolePosition}`}
																	variant={getRoleBadgeVariant(role.roleCode)}
																>
																	{role.role?.label ?? role.roleCode}
																</Badge>
															))
													) : (
														<span className="text-base-content/40">-</span>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openCreditEditDialog(credit)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCreditDelete(credit)}
													>
														<Trash2 className="h-4 w-4 text-error" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			{/* 関連リンク */}
			<div className="mt-6 flex items-center gap-4">
				<Link to="/admin/tracks" className="btn btn-outline btn-sm">
					<ArrowLeft className="mr-1 h-4 w-4" />
					トラック一覧
				</Link>
				{track.release && (
					<Link
						to="/admin/releases/$id"
						params={{ id: track.release.id }}
						className="btn btn-outline btn-sm"
					>
						<Disc3 className="mr-1 h-4 w-4" />
						作品詳細
					</Link>
				)}
			</div>

			{/* クレジット追加ダイアログ */}
			<Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>クレジットの追加</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>
								アーティスト名義 <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={getCurrentCreditNameOptionValue()}
								onChange={handleCreditNameOptionChange}
								options={creditNameOptions.map((opt) => ({
									value: opt.value,
									label: opt.label,
								}))}
								placeholder="アーティスト名義を選択"
								searchPlaceholder="アーティスト名義を検索..."
								emptyMessage="アーティスト名義が見つかりません"
								clearable={true}
							/>
							{creditForm.artistId && (
								<p className="text-base-content/60 text-xs">
									アーティスト:{" "}
									{artistsData?.data.find((a) => a.id === creditForm.artistId)
										?.name ?? "-"}{" "}
									/ 名義:{" "}
									{creditForm.artistAliasId
										? (allAliasesData?.data.find(
												(a) => a.id === creditForm.artistAliasId,
											)?.name ?? "-")
										: (artistsData?.data.find(
												(a) => a.id === creditForm.artistId,
											)?.name ?? "-")}
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label>
								盤面表記 <span className="text-error">*</span>
							</Label>
							<Input
								value={creditForm.creditName}
								onChange={(e) =>
									setCreditForm({ ...creditForm, creditName: e.target.value })
								}
								placeholder="盤面に表示される名前"
							/>
						</div>

						<div className="grid gap-2">
							<Label>役割</Label>
							<div className="flex flex-wrap gap-2">
								{creditRolesData?.data.map((role) => (
									<label
										key={role.code}
										className={`badge cursor-pointer ${
											creditForm.selectedRoles.includes(role.code)
												? "badge-primary"
												: "badge-outline"
										}`}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={creditForm.selectedRoles.includes(role.code)}
											onChange={() => handleRoleToggle(role.code)}
										/>
										{role.label}
									</label>
								))}
								{(!creditRolesData || creditRolesData.data.length === 0) && (
									<span className="text-base-content/40 text-sm">
										役割マスターが登録されていません
									</span>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeCreditDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreditSubmit}
							disabled={
								isSubmitting || !creditForm.artistId || !creditForm.creditName
							}
						>
							{isSubmitting ? "追加中..." : "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* クレジット編集ダイアログ */}
			<Dialog
				open={isCreditEditDialogOpen}
				onOpenChange={setIsCreditEditDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>クレジットの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>
								アーティスト名義 <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={getCurrentCreditNameOptionValue()}
								onChange={handleCreditNameOptionChange}
								options={creditNameOptions.map((opt) => ({
									value: opt.value,
									label: opt.label,
								}))}
								placeholder="アーティスト名義を選択"
								searchPlaceholder="アーティスト名義を検索..."
								emptyMessage="アーティスト名義が見つかりません"
								clearable={true}
							/>
							{creditForm.artistId && (
								<p className="text-base-content/60 text-xs">
									アーティスト:{" "}
									{artistsData?.data.find((a) => a.id === creditForm.artistId)
										?.name ?? "-"}{" "}
									/ 名義:{" "}
									{creditForm.artistAliasId
										? (allAliasesData?.data.find(
												(a) => a.id === creditForm.artistAliasId,
											)?.name ?? "-")
										: (artistsData?.data.find(
												(a) => a.id === creditForm.artistId,
											)?.name ?? "-")}
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label>
								盤面表記 <span className="text-error">*</span>
							</Label>
							<Input
								value={creditForm.creditName}
								onChange={(e) =>
									setCreditForm({ ...creditForm, creditName: e.target.value })
								}
								placeholder="盤面に表示される名前"
							/>
						</div>

						<div className="grid gap-2">
							<Label>役割</Label>
							<div className="flex flex-wrap gap-2">
								{creditRolesData?.data.map((role) => (
									<label
										key={role.code}
										className={`badge cursor-pointer ${
											creditForm.selectedRoles.includes(role.code)
												? "badge-primary"
												: "badge-outline"
										}`}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={creditForm.selectedRoles.includes(role.code)}
											onChange={() => handleRoleToggle(role.code)}
										/>
										{role.label}
									</label>
								))}
								{(!creditRolesData || creditRolesData.data.length === 0) && (
									<span className="text-base-content/40 text-sm">
										役割マスターが登録されていません
									</span>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeCreditEditDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreditSubmit}
							disabled={
								isSubmitting || !creditForm.artistId || !creditForm.creditName
							}
						>
							{isSubmitting ? "更新中..." : "更新"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
