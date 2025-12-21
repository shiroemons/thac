import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db/utils/id";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Disc3,
	ExternalLink,
	GitFork,
	Music,
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
import { GroupedSearchableSelect } from "@/components/ui/grouped-searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

// 国コード一覧
const COUNTRY_CODE_OPTIONS = [
	{ value: "JP", label: "JP - 日本" },
	{ value: "US", label: "US - アメリカ" },
	{ value: "GB", label: "GB - イギリス" },
	{ value: "DE", label: "DE - ドイツ" },
	{ value: "FR", label: "FR - フランス" },
	{ value: "CN", label: "CN - 中国" },
	{ value: "KR", label: "KR - 韓国" },
	{ value: "TW", label: "TW - 台湾" },
] as const;

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
	officialSongsApi,
	platformsApi,
	type Track,
	type TrackCredit,
	type TrackDerivation,
	type TrackIsrc,
	type TrackOfficialSong,
	type TrackPublication,
	trackCreditsApi,
	trackDerivationsApi,
	trackIsrcsApi,
	trackOfficialSongsApi,
	trackPublicationsApi,
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

	// 原曲紐付けダイアログ
	const [isOfficialSongDialogOpen, setIsOfficialSongDialogOpen] =
		useState(false);
	const [officialSongForm, setOfficialSongForm] = useState({
		id: "",
		officialSongId: "",
		partPosition: null as number | null,
		startSecond: null as number | null,
		endSecond: null as number | null,
		confidence: null as number | null,
		notes: "",
	});
	const [editingOfficialSong, setEditingOfficialSong] =
		useState<TrackOfficialSong | null>(null);

	// 派生関係ダイアログ
	const [isDerivationDialogOpen, setIsDerivationDialogOpen] = useState(false);
	const [derivationForm, setDerivationForm] = useState({
		id: "",
		parentTrackId: "",
		notes: "",
	});

	// 公開リンクダイアログ
	const [isPublicationDialogOpen, setIsPublicationDialogOpen] = useState(false);
	const [publicationForm, setPublicationForm] = useState({
		id: "",
		platformCode: "",
		platformItemId: "",
		url: "",
		visibility: "public" as "public" | "unlisted" | "private",
		publishedAt: "",
		isOfficial: false,
		countryCode: "",
	});
	const [editingPublication, setEditingPublication] =
		useState<TrackPublication | null>(null);

	// ISRCダイアログ
	const [isIsrcDialogOpen, setIsIsrcDialogOpen] = useState(false);
	const [isrcForm, setIsrcForm] = useState({
		id: "",
		isrc: "",
		assignedAt: "",
		isPrimary: true,
		source: "",
	});
	const [editingIsrc, setEditingIsrc] = useState<TrackIsrc | null>(null);

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

	// 原曲紐付け一覧
	const { data: officialSongsRelations } = useQuery({
		queryKey: ["track-official-songs", trackId],
		queryFn: () => trackOfficialSongsApi.list(trackId),
		staleTime: 30_000,
	});

	// 派生関係一覧
	const { data: derivations } = useQuery({
		queryKey: ["track-derivations", trackId],
		queryFn: () => trackDerivationsApi.list(trackId),
		staleTime: 30_000,
	});

	// 公開リンク一覧
	const { data: publications } = useQuery({
		queryKey: ["track-publications", trackId],
		queryFn: () => trackPublicationsApi.list(trackId),
		staleTime: 30_000,
	});

	// ISRC一覧
	const { data: isrcs } = useQuery({
		queryKey: ["track-isrcs", trackId],
		queryFn: () => trackIsrcsApi.list(trackId),
		staleTime: 30_000,
	});

	// 公式楽曲マスター
	const { data: officialSongsData } = useQuery({
		queryKey: ["official-songs", { limit: 500 }],
		queryFn: () => officialSongsApi.list({ limit: 500 }),
		staleTime: 60_000,
	});

	// プラットフォームマスター
	const { data: platformsData } = useQuery({
		queryKey: ["platforms"],
		queryFn: () => platformsApi.list(),
		staleTime: 60_000,
	});

	// トラック一覧（派生関係用）
	const { data: allTracksData } = useQuery({
		queryKey: ["tracks-all", { limit: 500 }],
		queryFn: () => tracksApi.listAll({ limit: 500 }),
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

	// === 原曲紐付け関連ハンドラー ===
	const openOfficialSongDialog = () => {
		setOfficialSongForm({
			id: createId.trackOfficialSong(),
			officialSongId: "",
			partPosition: null,
			startSecond: null,
			endSecond: null,
			confidence: null,
			notes: "",
		});
		setEditingOfficialSong(null);
		setIsOfficialSongDialogOpen(true);
		setMutationError(null);
	};

	const openOfficialSongEditDialog = (relation: TrackOfficialSong) => {
		setOfficialSongForm({
			id: relation.id,
			officialSongId: relation.officialSongId,
			partPosition: relation.partPosition,
			startSecond: relation.startSecond,
			endSecond: relation.endSecond,
			confidence: relation.confidence,
			notes: relation.notes ?? "",
		});
		setEditingOfficialSong(relation);
		setIsOfficialSongDialogOpen(true);
		setMutationError(null);
	};

	const closeOfficialSongDialog = () => {
		setIsOfficialSongDialogOpen(false);
		setEditingOfficialSong(null);
	};

	const handleOfficialSongSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);

		try {
			if (editingOfficialSong) {
				await trackOfficialSongsApi.update(trackId, editingOfficialSong.id, {
					partPosition: officialSongForm.partPosition,
					startSecond: officialSongForm.startSecond,
					endSecond: officialSongForm.endSecond,
					confidence: officialSongForm.confidence,
					notes: officialSongForm.notes || null,
				});
			} else {
				await trackOfficialSongsApi.create(trackId, {
					id: officialSongForm.id,
					officialSongId: officialSongForm.officialSongId,
					partPosition: officialSongForm.partPosition,
					startSecond: officialSongForm.startSecond,
					endSecond: officialSongForm.endSecond,
					confidence: officialSongForm.confidence,
					notes: officialSongForm.notes || null,
				});
			}
			await queryClient.invalidateQueries({
				queryKey: ["track-official-songs", trackId],
			});
			closeOfficialSongDialog();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "原曲紐付けの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOfficialSongDelete = async (relation: TrackOfficialSong) => {
		if (
			!confirm(
				`原曲紐付け "${relation.officialSong?.name ?? relation.officialSongId}" を削除しますか？`,
			)
		) {
			return;
		}

		try {
			await trackOfficialSongsApi.delete(trackId, relation.id);
			await queryClient.invalidateQueries({
				queryKey: ["track-official-songs", trackId],
			});
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "原曲紐付けの削除に失敗しました",
			);
		}
	};

	// === 派生関係ハンドラー ===
	const openDerivationDialog = () => {
		setDerivationForm({
			id: createId.trackDerivation(),
			parentTrackId: "",
			notes: "",
		});
		setIsDerivationDialogOpen(true);
		setMutationError(null);
	};

	const closeDerivationDialog = () => {
		setIsDerivationDialogOpen(false);
	};

	const handleDerivationSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);

		try {
			await trackDerivationsApi.create(trackId, {
				id: derivationForm.id,
				parentTrackId: derivationForm.parentTrackId,
				notes: derivationForm.notes || null,
			});
			await queryClient.invalidateQueries({
				queryKey: ["track-derivations", trackId],
			});
			closeDerivationDialog();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "派生関係の追加に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDerivationDelete = async (derivation: TrackDerivation) => {
		if (
			!confirm(
				`派生関係 "${derivation.parentTrack?.name ?? derivation.parentTrackId}" を削除しますか？`,
			)
		) {
			return;
		}

		try {
			await trackDerivationsApi.delete(trackId, derivation.id);
			await queryClient.invalidateQueries({
				queryKey: ["track-derivations", trackId],
			});
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "派生関係の削除に失敗しました",
			);
		}
	};

	// === 公開リンクハンドラー ===
	const openPublicationDialog = () => {
		setPublicationForm({
			id: createId.trackPublication(),
			platformCode: "",
			platformItemId: "",
			url: "",
			visibility: "public",
			publishedAt: "",
			isOfficial: false,
			countryCode: "JP",
		});
		setEditingPublication(null);
		setIsPublicationDialogOpen(true);
		setMutationError(null);
	};

	const openPublicationEditDialog = (publication: TrackPublication) => {
		setPublicationForm({
			id: publication.id,
			platformCode: publication.platformCode,
			platformItemId: publication.platformItemId ?? "",
			url: publication.url,
			visibility: publication.visibility ?? "public",
			publishedAt: publication.publishedAt
				? format(new Date(publication.publishedAt), "yyyy-MM-dd")
				: "",
			isOfficial: publication.isOfficial,
			countryCode: publication.countryCode ?? "",
		});
		setEditingPublication(publication);
		setIsPublicationDialogOpen(true);
		setMutationError(null);
	};

	const closePublicationDialog = () => {
		setIsPublicationDialogOpen(false);
		setEditingPublication(null);
	};

	const handlePublicationSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);

		try {
			if (editingPublication) {
				await trackPublicationsApi.update(trackId, editingPublication.id, {
					platformItemId: publicationForm.platformItemId || null,
					url: publicationForm.url,
					visibility: publicationForm.visibility,
					publishedAt: publicationForm.publishedAt || null,
					isOfficial: publicationForm.isOfficial,
					countryCode: publicationForm.countryCode || null,
				});
			} else {
				await trackPublicationsApi.create(trackId, {
					id: publicationForm.id,
					platformCode: publicationForm.platformCode,
					url: publicationForm.url,
					platformItemId: publicationForm.platformItemId || null,
					visibility: publicationForm.visibility,
					publishedAt: publicationForm.publishedAt || null,
					isOfficial: publicationForm.isOfficial,
					countryCode: publicationForm.countryCode || null,
				});
			}
			await queryClient.invalidateQueries({
				queryKey: ["track-publications", trackId],
			});
			closePublicationDialog();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "公開リンクの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePublicationDelete = async (publication: TrackPublication) => {
		if (!confirm(`公開リンク "${publication.url}" を削除しますか？`)) {
			return;
		}

		try {
			await trackPublicationsApi.delete(trackId, publication.id);
			await queryClient.invalidateQueries({
				queryKey: ["track-publications", trackId],
			});
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "公開リンクの削除に失敗しました",
			);
		}
	};

	// === ISRCハンドラー ===
	const openIsrcDialog = () => {
		setIsrcForm({
			id: createId.trackIsrc(),
			isrc: "",
			assignedAt: "",
			isPrimary: (isrcs?.length ?? 0) === 0,
			source: "",
		});
		setEditingIsrc(null);
		setIsIsrcDialogOpen(true);
		setMutationError(null);
	};

	const openIsrcEditDialog = (isrc: TrackIsrc) => {
		setIsrcForm({
			id: isrc.id,
			isrc: isrc.isrc,
			assignedAt: isrc.assignedAt ?? "",
			isPrimary: isrc.isPrimary,
			source: isrc.source ?? "",
		});
		setEditingIsrc(isrc);
		setIsIsrcDialogOpen(true);
		setMutationError(null);
	};

	const closeIsrcDialog = () => {
		setIsIsrcDialogOpen(false);
		setEditingIsrc(null);
	};

	const handleIsrcSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);

		try {
			if (editingIsrc) {
				await trackIsrcsApi.update(trackId, editingIsrc.id, {
					assignedAt: isrcForm.assignedAt || null,
					isPrimary: isrcForm.isPrimary,
					source: isrcForm.source || null,
				});
			} else {
				await trackIsrcsApi.create(trackId, {
					id: isrcForm.id,
					isrc: isrcForm.isrc,
					assignedAt: isrcForm.assignedAt || null,
					isPrimary: isrcForm.isPrimary,
					source: isrcForm.source || null,
				});
			}
			await queryClient.invalidateQueries({
				queryKey: ["track-isrcs", trackId],
			});
			closeIsrcDialog();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "ISRCの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleIsrcDelete = async (isrc: TrackIsrc) => {
		if (!confirm(`ISRC "${isrc.isrc}" を削除しますか？`)) {
			return;
		}

		try {
			await trackIsrcsApi.delete(trackId, isrc.id);
			await queryClient.invalidateQueries({
				queryKey: ["track-isrcs", trackId],
			});
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "ISRCの削除に失敗しました",
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

			{/* 原曲紐付け一覧 */}
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<Music className="mr-2 inline-block h-5 w-5" />
						原曲紐付け
					</h2>
					<Button variant="outline" size="sm" onClick={openOfficialSongDialog}>
						<Plus className="mr-2 h-4 w-4" />
						原曲追加
					</Button>
				</div>

				<div className="p-4">
					{!officialSongsRelations || officialSongsRelations.length === 0 ? (
						<p className="py-8 text-center text-base-content/50">
							原曲紐付けが登録されていません
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>公式楽曲</TableHead>
									<TableHead className="w-[80px]">順序</TableHead>
									<TableHead className="w-[120px]">時間範囲</TableHead>
									<TableHead className="w-[80px]">確度</TableHead>
									<TableHead>備考</TableHead>
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{officialSongsRelations
									.sort((a, b) => (a.partPosition ?? 0) - (b.partPosition ?? 0))
									.map((relation) => (
										<TableRow key={relation.id}>
											<TableCell className="font-medium">
												{relation.officialSong?.name ?? relation.officialSongId}
											</TableCell>
											<TableCell>{relation.partPosition ?? "-"}</TableCell>
											<TableCell>
												{relation.startSecond != null ||
												relation.endSecond != null
													? `${relation.startSecond ?? "?"}s〜${relation.endSecond ?? "?"}s`
													: "-"}
											</TableCell>
											<TableCell>
												{relation.confidence != null
													? `${relation.confidence}%`
													: "-"}
											</TableCell>
											<TableCell className="max-w-[200px] truncate text-sm">
												{relation.notes || "-"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openOfficialSongEditDialog(relation)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleOfficialSongDelete(relation)}
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

			{/* 派生関係一覧 */}
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<GitFork className="mr-2 inline-block h-5 w-5" />
						派生関係
					</h2>
					<Button variant="outline" size="sm" onClick={openDerivationDialog}>
						<Plus className="mr-2 h-4 w-4" />
						派生元追加
					</Button>
				</div>

				<div className="p-4">
					{!derivations || derivations.length === 0 ? (
						<p className="py-8 text-center text-base-content/50">
							派生関係が登録されていません
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>派生元トラック</TableHead>
									<TableHead>備考</TableHead>
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{derivations.map((derivation) => (
									<TableRow key={derivation.id}>
										<TableCell className="font-medium">
											{derivation.parentTrack ? (
												<Link
													to="/admin/tracks/$id"
													params={{ id: derivation.parentTrackId }}
													className="text-primary hover:underline"
												>
													{derivation.parentTrack.name}
												</Link>
											) : (
												derivation.parentTrackId
											)}
										</TableCell>
										<TableCell className="max-w-[300px] truncate text-sm">
											{derivation.notes || "-"}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDerivationDelete(derivation)}
											>
												<Trash2 className="h-4 w-4 text-error" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			{/* 公開リンク一覧 */}
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<ExternalLink className="mr-2 inline-block h-5 w-5" />
						公開リンク
					</h2>
					<Button variant="outline" size="sm" onClick={openPublicationDialog}>
						<Plus className="mr-2 h-4 w-4" />
						公開リンク追加
					</Button>
				</div>

				<div className="p-4">
					{!publications || publications.length === 0 ? (
						<p className="py-8 text-center text-base-content/50">
							公開リンクが登録されていません
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>プラットフォーム</TableHead>
									<TableHead>URL</TableHead>
									<TableHead className="w-[80px]">状態</TableHead>
									<TableHead className="w-[80px]">公式</TableHead>
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{publications.map((pub) => (
									<TableRow key={pub.id}>
										<TableCell>
											{pub.platform?.name ?? pub.platformCode}
										</TableCell>
										<TableCell className="max-w-[300px] truncate">
											<a
												href={pub.url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{pub.url}
											</a>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													pub.visibility === "public"
														? "success"
														: pub.visibility === "unlisted"
															? "warning"
															: "ghost"
												}
											>
												{pub.visibility === "public"
													? "公開"
													: pub.visibility === "unlisted"
														? "限定"
														: "非公開"}
											</Badge>
										</TableCell>
										<TableCell>
											{pub.isOfficial ? (
												<Badge variant="primary">公式</Badge>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openPublicationEditDialog(pub)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handlePublicationDelete(pub)}
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

			{/* ISRC一覧 */}
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">ISRC</h2>
					<Button variant="outline" size="sm" onClick={openIsrcDialog}>
						<Plus className="mr-2 h-4 w-4" />
						ISRC追加
					</Button>
				</div>

				<div className="p-4">
					{!isrcs || isrcs.length === 0 ? (
						<p className="py-8 text-center text-base-content/50">
							ISRCが登録されていません
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>ISRC</TableHead>
									<TableHead className="w-[80px]">主要</TableHead>
									<TableHead>付与日</TableHead>
									<TableHead>取得元</TableHead>
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{isrcs.map((isrc) => (
									<TableRow key={isrc.id}>
										<TableCell className="font-medium font-mono">
											{isrc.isrc}
										</TableCell>
										<TableCell>
											{isrc.isPrimary ? (
												<Badge variant="primary">主要</Badge>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell>{isrc.assignedAt || "-"}</TableCell>
										<TableCell className="max-w-[200px] truncate text-sm">
											{isrc.source || "-"}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openIsrcEditDialog(isrc)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleIsrcDelete(isrc)}
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

			{/* 原曲紐付けダイアログ */}
			<Dialog
				open={isOfficialSongDialogOpen}
				onOpenChange={setIsOfficialSongDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingOfficialSong ? "原曲紐付けの編集" : "原曲紐付けの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{!editingOfficialSong && (
							<div className="grid gap-2">
								<Label>
									公式楽曲 <span className="text-error">*</span>
								</Label>
								<GroupedSearchableSelect
									value={officialSongForm.officialSongId}
									onChange={(val) =>
										setOfficialSongForm({
											...officialSongForm,
											officialSongId: val,
										})
									}
									options={(officialSongsData?.data ?? []).map((song) => ({
										value: song.id,
										label: song.name,
										group: song.workName || undefined,
									}))}
									placeholder="公式楽曲を選択"
									searchPlaceholder="公式楽曲を検索..."
									emptyMessage="公式楽曲が見つかりません"
									ungroupedLabel="作品未設定"
								/>
							</div>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>順序（part_position）</Label>
								<Input
									type="number"
									min="1"
									value={officialSongForm.partPosition ?? ""}
									onChange={(e) =>
										setOfficialSongForm({
											...officialSongForm,
											partPosition: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="1, 2, ..."
								/>
							</div>
							<div className="grid gap-2">
								<Label>確度: {officialSongForm.confidence ?? 0}%</Label>
								<input
									type="range"
									min="0"
									max="100"
									step="10"
									value={officialSongForm.confidence ?? 0}
									onChange={(e) =>
										setOfficialSongForm({
											...officialSongForm,
											confidence: Number.parseInt(e.target.value, 10),
										})
									}
									className="range range-primary range-sm"
								/>
								<div className="flex w-full justify-between px-1 text-base-content/50 text-xs">
									<span>0</span>
									<span>50</span>
									<span>100</span>
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>開始秒</Label>
								<Input
									type="number"
									min="0"
									step="0.1"
									value={officialSongForm.startSecond ?? ""}
									onChange={(e) =>
										setOfficialSongForm({
											...officialSongForm,
											startSecond: e.target.value
												? Number.parseFloat(e.target.value)
												: null,
										})
									}
									placeholder="0.0"
								/>
							</div>
							<div className="grid gap-2">
								<Label>終了秒</Label>
								<Input
									type="number"
									min="0"
									step="0.1"
									value={officialSongForm.endSecond ?? ""}
									onChange={(e) =>
										setOfficialSongForm({
											...officialSongForm,
											endSecond: e.target.value
												? Number.parseFloat(e.target.value)
												: null,
										})
									}
									placeholder="0.0"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label>備考</Label>
							<Input
								value={officialSongForm.notes}
								onChange={(e) =>
									setOfficialSongForm({
										...officialSongForm,
										notes: e.target.value,
									})
								}
								placeholder="備考"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeOfficialSongDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleOfficialSongSubmit}
							disabled={
								isSubmitting ||
								(!editingOfficialSong && !officialSongForm.officialSongId)
							}
						>
							{isSubmitting
								? editingOfficialSong
									? "更新中..."
									: "追加中..."
								: editingOfficialSong
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 派生関係ダイアログ */}
			<Dialog
				open={isDerivationDialogOpen}
				onOpenChange={setIsDerivationDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>派生元トラックの追加</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>
								派生元トラック <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={derivationForm.parentTrackId}
								onChange={(val) =>
									setDerivationForm({ ...derivationForm, parentTrackId: val })
								}
								options={(allTracksData?.data ?? [])
									.filter((t) => t.id !== trackId)
									.map((t) => ({
										value: t.id,
										label: t.name,
									}))}
								placeholder="トラックを選択"
								searchPlaceholder="トラックを検索..."
								emptyMessage="トラックが見つかりません"
							/>
						</div>
						<div className="grid gap-2">
							<Label>備考</Label>
							<Input
								value={derivationForm.notes}
								onChange={(e) =>
									setDerivationForm({
										...derivationForm,
										notes: e.target.value,
									})
								}
								placeholder="備考"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeDerivationDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleDerivationSubmit}
							disabled={isSubmitting || !derivationForm.parentTrackId}
						>
							{isSubmitting ? "追加中..." : "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 公開リンクダイアログ */}
			<Dialog
				open={isPublicationDialogOpen}
				onOpenChange={setIsPublicationDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingPublication ? "公開リンクの編集" : "公開リンクの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{!editingPublication && (
							<div className="grid gap-2">
								<Label>
									プラットフォーム <span className="text-error">*</span>
								</Label>
								<GroupedSearchableSelect
									value={publicationForm.platformCode}
									onChange={(val) =>
										setPublicationForm({
											...publicationForm,
											platformCode: val,
										})
									}
									options={(platformsData?.data ?? []).map((p) => ({
										value: p.code,
										label: p.name,
										group: p.category || undefined,
									}))}
									placeholder="プラットフォームを選択"
									searchPlaceholder="プラットフォームを検索..."
									emptyMessage="プラットフォームが見つかりません"
									ungroupedLabel="その他"
								/>
							</div>
						)}
						<div className="grid gap-2">
							<Label>
								URL <span className="text-error">*</span>
							</Label>
							<Input
								type="url"
								value={publicationForm.url}
								onChange={(e) =>
									setPublicationForm({
										...publicationForm,
										url: e.target.value,
									})
								}
								placeholder="https://..."
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>プラットフォームID</Label>
								<Input
									value={publicationForm.platformItemId}
									onChange={(e) =>
										setPublicationForm({
											...publicationForm,
											platformItemId: e.target.value,
										})
									}
									placeholder="例: sm12345678"
								/>
							</div>
							<div className="grid gap-2">
								<Label>公開状態</Label>
								<select
									className="select select-bordered w-full"
									value={publicationForm.visibility}
									onChange={(e) =>
										setPublicationForm({
											...publicationForm,
											visibility: e.target.value as
												| "public"
												| "unlisted"
												| "private",
										})
									}
								>
									<option value="public">公開</option>
									<option value="unlisted">限定公開</option>
									<option value="private">非公開</option>
								</select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>公開日</Label>
								<Input
									type="date"
									value={publicationForm.publishedAt}
									onChange={(e) =>
										setPublicationForm({
											...publicationForm,
											publishedAt: e.target.value,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label>国コード</Label>
								<select
									className="select select-bordered w-full"
									value={publicationForm.countryCode}
									onChange={(e) =>
										setPublicationForm({
											...publicationForm,
											countryCode: e.target.value,
										})
									}
								>
									<option value="">選択してください</option>
									{COUNTRY_CODE_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>
						</div>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								className="checkbox"
								checked={publicationForm.isOfficial}
								onChange={(e) =>
									setPublicationForm({
										...publicationForm,
										isOfficial: e.target.checked,
									})
								}
							/>
							<span>公式アップロード</span>
						</label>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closePublicationDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handlePublicationSubmit}
							disabled={
								isSubmitting ||
								!publicationForm.url ||
								(!editingPublication && !publicationForm.platformCode)
							}
						>
							{isSubmitting
								? editingPublication
									? "更新中..."
									: "追加中..."
								: editingPublication
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ISRCダイアログ */}
			<Dialog open={isIsrcDialogOpen} onOpenChange={setIsIsrcDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>
							{editingIsrc ? "ISRCの編集" : "ISRCの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{!editingIsrc && (
							<div className="grid gap-2">
								<Label>
									ISRC <span className="text-error">*</span>
								</Label>
								<Input
									value={isrcForm.isrc}
									onChange={(e) =>
										setIsrcForm({
											...isrcForm,
											isrc: e.target.value.toUpperCase(),
										})
									}
									placeholder="JPXX01234567"
									maxLength={12}
									className="font-mono"
								/>
								<p className="text-base-content/60 text-xs">
									12桁：国コード(2) + 登録者コード(3) + 年(2) + コード(5)
								</p>
							</div>
						)}
						<div className="grid gap-2">
							<Label>付与日</Label>
							<Input
								value={isrcForm.assignedAt}
								onChange={(e) =>
									setIsrcForm({ ...isrcForm, assignedAt: e.target.value })
								}
								placeholder="YYYY-MM-DD"
							/>
						</div>
						<div className="grid gap-2">
							<Label>取得元</Label>
							<Input
								value={isrcForm.source}
								onChange={(e) =>
									setIsrcForm({ ...isrcForm, source: e.target.value })
								}
								placeholder="例: Spotify, Apple Music"
							/>
						</div>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								className="checkbox"
								checked={isrcForm.isPrimary}
								onChange={(e) =>
									setIsrcForm({ ...isrcForm, isPrimary: e.target.checked })
								}
							/>
							<span>主要ISRCとして設定</span>
						</label>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeIsrcDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleIsrcSubmit}
							disabled={isSubmitting || (!editingIsrc && !isrcForm.isrc)}
						>
							{isSubmitting
								? editingIsrc
									? "更新中..."
									: "追加中..."
								: editingIsrc
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
