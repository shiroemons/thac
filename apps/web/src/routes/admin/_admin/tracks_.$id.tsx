import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowLeft,
	Disc3,
	ExternalLink,
	GitFork,
	Home,
	Music,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { TrackEditDialog } from "@/components/admin/track-edit-dialog";
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
import { NestedGroupedSearchableSelect } from "@/components/ui/nested-grouped-searchable-select";
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
	officialSongsApi,
	platformsApi,
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
import {
	PLATFORM_CATEGORY_LABELS,
	PLATFORM_CATEGORY_ORDER,
} from "@/lib/constants";
import { createTrackDetailHead } from "@/lib/head";
import { trackDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/tracks_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(trackDetailQueryOptions(params.id)),
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

	// トラック詳細取得（SSRデータをキャッシュとして活用）
	const {
		data: track,
		isPending,
		error,
	} = useQuery(trackDetailQueryOptions(trackId));

	// 編集ダイアログ
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	// 各種ダイアログ用（既存のダイアログで使用）
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
		customSongName: "",
		partPosition: null as number | null,
		startSecond: null as number | null,
		endSecond: null as number | null,
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
		url: "",
	});
	const [editingPublication, setEditingPublication] =
		useState<TrackPublication | null>(null);

	// ISRCダイアログ
	const [isIsrcDialogOpen, setIsIsrcDialogOpen] = useState(false);
	const [isrcForm, setIsrcForm] = useState({
		id: "",
		isrc: "",
		isPrimary: true,
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

	// 公式楽曲マスター（全件取得）
	const { data: officialSongsData } = useQuery({
		queryKey: ["official-songs", { limit: 3000 }],
		queryFn: () => officialSongsApi.list({ limit: 3000 }),
		staleTime: 60_000,
	});

	// 公式楽曲のネスト化オプション（カテゴリ → 作品 → 楽曲）
	const officialSongOptions = useMemo(() => {
		const songs = officialSongsData?.data ?? [];
		// カテゴリのsortOrder、楽曲IDでソート（ID順で作品も自然に並ぶ）
		const sorted = [...songs].sort((a, b) => {
			const aSortOrder = a.workCategorySortOrder ?? 999;
			const bSortOrder = b.workCategorySortOrder ?? 999;
			if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;
			// 楽曲IDでソート（作品IDが含まれているため作品順も維持される）
			return a.id.localeCompare(b.id);
		});
		const songOptions = sorted.map((song) => ({
			value: song.id,
			label: song.name,
			category: song.workCategoryName || "その他",
			subgroup: song.workName || "作品なし",
		}));
		return songOptions;
	}, [officialSongsData?.data]);

	// 公式楽曲のグループ順序（カテゴリのsortOrder順）
	const officialSongGroupOrder = useMemo(() => {
		const songs = officialSongsData?.data ?? [];
		const categories = new Map<string, number>();
		for (const song of songs) {
			const name = song.workCategoryName || "その他";
			const order = song.workCategorySortOrder ?? 999;
			if (!categories.has(name)) {
				categories.set(name, order);
			}
		}
		return Array.from(categories.entries())
			.sort((a, b) => a[1] - b[1])
			.map(([name]) => name);
	}, [officialSongsData?.data]);

	// ロール別クレジット抽出
	const roleSummary = useMemo(() => {
		const credits = track?.credits ?? [];
		const getCreditsByRole = (roleCode: string): string[] => {
			return credits
				.filter((credit) =>
					credit.roles?.some((role) => role.roleCode === roleCode),
				)
				.sort((a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0))
				.map((credit) => credit.creditName);
		};

		return {
			vocalists: getCreditsByRole("vocalist"),
			arrangers: getCreditsByRole("arranger"),
			remixers: getCreditsByRole("remixer"),
			lyricists: getCreditsByRole("lyricist"),
			composers: getCreditsByRole("composer"),
		};
	}, [track?.credits]);

	// プラットフォームマスター
	const { data: platformsData } = useQuery({
		queryKey: ["platforms"],
		queryFn: () => platformsApi.list({ limit: 100 }),
		staleTime: 60_000,
	});

	// プラットフォームのグループ化オプション（日本語ラベル・順序付き）
	const platformOptions = useMemo(() => {
		const platforms = platformsData?.data ?? [];
		// sortOrder でソート
		const sorted = [...platforms].sort(
			(a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
		);
		return sorted.map((p) => ({
			value: p.code,
			label: p.name,
			group: PLATFORM_CATEGORY_LABELS[p.category || "other"] || "その他",
		}));
	}, [platformsData?.data]);

	// プラットフォームのグループ順序（日本語ラベル）
	const platformGroupOrder = useMemo(
		() => PLATFORM_CATEGORY_ORDER.map((key) => PLATFORM_CATEGORY_LABELS[key]),
		[],
	);

	// トラック一覧（派生関係用）
	const { data: allTracksData } = useQuery({
		queryKey: ["tracks-all", { limit: 500 }],
		queryFn: () => tracksApi.listPaginated({ limit: 500 }),
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

	// トラッククエリ無効化
	const invalidateTrackQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["track", trackId] });
	};

	// クレジット追加ダイアログを開く
	const openCreditDialog = () => {
		const maxPosition = Math.max(
			0,
			...(track?.credits.map((c) => c.creditPosition ?? 0) ?? []),
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
			creditPosition: credit.creditPosition ?? 1,
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
					track.releaseId!,
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
				await trackCreditsApi.create(track.releaseId!, track.id, {
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
			await trackCreditsApi.delete(track.releaseId!, track.id, credit.id);
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
			(a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0),
		);
		const prevCredit = sortedCredits[index - 1];

		try {
			await Promise.all([
				trackCreditsApi.update(track.releaseId!, track.id, credit.id, {
					creditPosition: prevCredit.creditPosition,
				}),
				trackCreditsApi.update(track.releaseId!, track.id, prevCredit.id, {
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
			(a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0),
		);
		if (index === sortedCredits.length - 1) return;
		const nextCredit = sortedCredits[index + 1];

		try {
			await Promise.all([
				trackCreditsApi.update(track.releaseId!, track.id, credit.id, {
					creditPosition: nextCredit.creditPosition,
				}),
				trackCreditsApi.update(track.releaseId!, track.id, nextCredit.id, {
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
			customSongName: "",
			partPosition: null,
			startSecond: null,
			endSecond: null,
			notes: "",
		});
		setEditingOfficialSong(null);
		setIsOfficialSongDialogOpen(true);
		setMutationError(null);
	};

	const openOfficialSongEditDialog = (relation: TrackOfficialSong) => {
		setOfficialSongForm({
			id: relation.id,
			officialSongId: relation.officialSongId ?? "",
			customSongName: relation.customSongName ?? "",
			partPosition: relation.partPosition,
			startSecond: relation.startSecond,
			endSecond: relation.endSecond,
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
			// 「その他」が選択されている場合はcustomSongNameを使用
			const isCustom = officialSongForm.officialSongId === "07999999";

			if (editingOfficialSong) {
				await trackOfficialSongsApi.update(trackId, editingOfficialSong.id, {
					partPosition: officialSongForm.partPosition,
					startSecond: officialSongForm.startSecond,
					endSecond: officialSongForm.endSecond,
					notes: officialSongForm.notes || null,
				});
			} else {
				await trackOfficialSongsApi.create(trackId, {
					id: officialSongForm.id,
					officialSongId: isCustom ? null : officialSongForm.officialSongId,
					customSongName: isCustom
						? officialSongForm.customSongName || null
						: null,
					partPosition: officialSongForm.partPosition,
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
		const songName =
			relation.officialSong?.name ??
			relation.customSongName ??
			relation.officialSongId ??
			"不明";
		if (!confirm(`原曲紐付け "${songName}" を削除しますか？`)) {
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

	const handleOfficialSongReorder = async (
		relationId: string,
		direction: "up" | "down",
	) => {
		try {
			await trackOfficialSongsApi.reorder(trackId, relationId, direction);
			await queryClient.invalidateQueries({
				queryKey: ["track-official-songs", trackId],
			});
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "並べ替えに失敗しました",
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
			url: "",
		});
		setEditingPublication(null);
		setIsPublicationDialogOpen(true);
		setMutationError(null);
	};

	const openPublicationEditDialog = (publication: TrackPublication) => {
		setPublicationForm({
			id: publication.id,
			platformCode: publication.platformCode,
			url: publication.url,
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
					url: publicationForm.url,
				});
			} else {
				await trackPublicationsApi.create(trackId, {
					id: publicationForm.id,
					platformCode: publicationForm.platformCode,
					url: publicationForm.url,
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
			isPrimary: (isrcs?.length ?? 0) === 0,
		});
		setEditingIsrc(null);
		setIsIsrcDialogOpen(true);
		setMutationError(null);
	};

	const openIsrcEditDialog = (isrc: TrackIsrc) => {
		setIsrcForm({
			id: isrc.id,
			isrc: isrc.isrc,
			isPrimary: isrc.isPrimary,
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
					isPrimary: isrcForm.isPrimary,
				});
			} else {
				await trackIsrcsApi.create(trackId, {
					id: isrcForm.id,
					isrc: isrcForm.isrc,
					isPrimary: isrcForm.isPrimary,
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

	// ローディング（キャッシュがない場合のみスケルトンを表示）
	if (isPending && !track) {
		return <DetailPageSkeleton cardCount={5} fieldsPerCard={4} />;
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
						<Link to="/admin/tracks">トラック管理</Link>
					</li>
					<li>{track.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center gap-4">
				<Link to="/admin/tracks" className="btn btn-ghost btn-sm">
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<h1 className="font-bold text-2xl">{track.name}</h1>
			</div>

			{mutationError && (
				<div className="alert alert-error mb-4">{mutationError}</div>
			)}

			{/* トラック情報カード */}
			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<div className="border-base-300 border-b p-4">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-xl">{track.name}</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditDialogOpen(true)}
						>
							<Pencil className="mr-1 h-4 w-4" />
							編集
						</Button>
					</div>
				</div>

				<div className="p-4">
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
									<p className="text-base-content/60 text-sm">イベント</p>
									{track.eventId && track.eventName ? (
										<Link
											to="/admin/events/$id"
											params={{ id: track.eventId }}
											className="text-primary hover:underline"
										>
											{track.eventName}
										</Link>
									) : (
										<p>-</p>
									)}
								</div>
								<div>
									<p className="text-base-content/60 text-sm">イベント日</p>
									<p>
										{track.eventDayDate
											? `${track.eventDayDate}${track.eventDayNumber ? ` (Day ${track.eventDayNumber})` : ""}`
											: "-"}
									</p>
								</div>
							</div>
						</div>
						<div className="border-base-300 border-t pt-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div>
									<p className="text-base-content/60 text-sm">
										リリース年/月/日
									</p>
									<p>
										{track.release?.releaseYear ?? "-"} /{" "}
										{track.release?.releaseMonth ?? "-"} /{" "}
										{track.release?.releaseDay ?? "-"}
									</p>
								</div>
								<div>
									<p className="text-base-content/60 text-sm">作成日時</p>
									<p className="text-sm">
										{format(new Date(track.createdAt), "yyyy/MM/dd HH:mm:ss", {
											locale: ja,
										})}
									</p>
								</div>
								<div>
									<p className="text-base-content/60 text-sm">更新日時</p>
									<p className="text-sm">
										{format(new Date(track.updatedAt), "yyyy/MM/dd HH:mm:ss", {
											locale: ja,
										})}
									</p>
								</div>
							</div>
						</div>

						<div className="border-base-300 border-t pt-4">
							<p className="text-base-content/60 text-sm">ID</p>
							<p className="font-mono text-xs">{track.id}</p>
						</div>
					</div>
				</div>
			</div>

			{/* ロール別サマリー */}
			{track.credits.length > 0 && (
				<div className="mt-6 rounded-lg border border-base-300 bg-base-100 shadow-sm">
					<div className="border-base-300 border-b p-4">
						<h2 className="font-bold text-lg">役割別担当者</h2>
					</div>
					<div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
						{roleSummary.vocalists.length > 0 && (
							<div>
								<p className="mb-1 font-medium text-base-content/70 text-sm">
									ボーカル
								</p>
								<p className="text-sm">{roleSummary.vocalists.join(" / ")}</p>
							</div>
						)}
						{roleSummary.arrangers.length > 0 && (
							<div>
								<p className="mb-1 font-medium text-base-content/70 text-sm">
									編曲
								</p>
								<p className="text-sm">{roleSummary.arrangers.join(" / ")}</p>
							</div>
						)}
						{roleSummary.remixers.length > 0 && (
							<div>
								<p className="mb-1 font-medium text-base-content/70 text-sm">
									リミックス
								</p>
								<p className="text-sm">{roleSummary.remixers.join(" / ")}</p>
							</div>
						)}
						{roleSummary.lyricists.length > 0 && (
							<div>
								<p className="mb-1 font-medium text-base-content/70 text-sm">
									作詞
								</p>
								<p className="text-sm">{roleSummary.lyricists.join(" / ")}</p>
							</div>
						)}
						{roleSummary.composers.length > 0 && (
							<div>
								<p className="mb-1 font-medium text-base-content/70 text-sm">
									作曲
								</p>
								<p className="text-sm">{roleSummary.composers.join(" / ")}</p>
							</div>
						)}
					</div>
				</div>
			)}

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
									.sort(
										(a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0),
									)
									.map((credit, index) => (
										<TableRow key={credit.id}>
											<TableCell>
												<ReorderButtons
													sortOrder={credit.creditPosition ?? 0}
													onMoveUp={() => handleCreditMoveUp(credit, index)}
													onMoveDown={() => handleCreditMoveDown(credit, index)}
													isFirst={index === 0}
													isLast={index === track.credits.length - 1}
												/>
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
									<TableHead className="w-[60px]">順序</TableHead>
									<TableHead>公式楽曲</TableHead>
									<TableHead className="w-[120px]">時間範囲</TableHead>
									<TableHead>備考</TableHead>
									<TableHead className="w-[120px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{officialSongsRelations
									.sort((a, b) => (a.partPosition ?? 0) - (b.partPosition ?? 0))
									.map((relation, index, arr) => (
										<TableRow key={relation.id}>
											<TableCell>
												<ReorderButtons
													sortOrder={relation.partPosition ?? 0}
													onMoveUp={() =>
														handleOfficialSongReorder(relation.id, "up")
													}
													onMoveDown={() =>
														handleOfficialSongReorder(relation.id, "down")
													}
													isFirst={index === 0}
													isLast={index === arr.length - 1}
												/>
											</TableCell>
											<TableCell className="font-medium">
												{relation.officialSong?.name ??
													relation.customSongName ??
													relation.officialSongId ??
													"-"}
												{relation.customSongName && (
													<span className="ml-2 text-base-content/50 text-xs">
														（カスタム）
													</span>
												)}
											</TableCell>
											<TableCell>
												{relation.startSecond != null ||
												relation.endSecond != null
													? `${relation.startSecond ?? "?"}s〜${relation.endSecond ?? "?"}s`
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
													{derivation.parentTrack.releaseName && (
														<span className="ml-1 text-base-content/60 text-sm">
															（{derivation.parentTrack.releaseName}）
														</span>
													)}
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
							<>
								<div className="grid gap-2">
									<Label>
										公式楽曲 <span className="text-error">*</span>
									</Label>
									<NestedGroupedSearchableSelect
										value={officialSongForm.officialSongId}
										onChange={(val) =>
											setOfficialSongForm({
												...officialSongForm,
												officialSongId: val,
												// カスタム以外を選択した場合はcustomSongNameをクリア
												customSongName:
													val === "07999999"
														? officialSongForm.customSongName
														: "",
											})
										}
										options={officialSongOptions}
										categoryOrder={officialSongGroupOrder}
										placeholder="公式楽曲を選択"
										searchPlaceholder="公式楽曲を検索..."
										emptyMessage="公式楽曲が見つかりません"
										ungroupedLabel="その他"
									/>
								</div>
								{officialSongForm.officialSongId === "07999999" && (
									<div className="grid gap-2">
										<Label>カスタム楽曲名</Label>
										<Input
											value={officialSongForm.customSongName}
											onChange={(e) =>
												setOfficialSongForm({
													...officialSongForm,
													customSongName: e.target.value,
												})
											}
											placeholder="楽曲名を入力..."
										/>
									</div>
								)}
							</>
						)}
						{editingOfficialSong && (
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
						)}
						<div className="grid gap-2">
							<Label>備考</Label>
							<textarea
								value={officialSongForm.notes}
								onChange={(e) =>
									setOfficialSongForm({
										...officialSongForm,
										notes: e.target.value,
									})
								}
								placeholder="備考を入力..."
								className="textarea textarea-bordered w-full"
								rows={3}
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
										label: t.releaseName
											? `${t.name}（${t.releaseName}）`
											: t.name,
									}))}
								placeholder="トラックを選択"
								searchPlaceholder="トラックを検索..."
								emptyMessage="トラックが見つかりません"
							/>
						</div>
						<div className="grid gap-2">
							<Label>備考</Label>
							<textarea
								value={derivationForm.notes}
								onChange={(e) =>
									setDerivationForm({
										...derivationForm,
										notes: e.target.value,
									})
								}
								placeholder="備考を入力..."
								className="textarea textarea-bordered w-full"
								rows={3}
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
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>
							{editingPublication ? "公開リンクの編集" : "公開リンクの追加"}
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
								value={publicationForm.platformCode}
								onChange={(val) =>
									setPublicationForm({
										...publicationForm,
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
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={closePublicationDialog}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handlePublicationSubmit}
							disabled={
								isSubmitting ||
								!publicationForm.platformCode ||
								!publicationForm.url
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
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}

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
						<Button
							variant="ghost"
							onClick={closeIsrcDialog}
							disabled={isSubmitting}
						>
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

			{/* トラック編集ダイアログ */}
			<TrackEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				track={track}
				onSuccess={invalidateTrackQuery}
			/>
		</div>
	);
}
