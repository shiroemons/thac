import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { EnhancedTrackSelect } from "@/components/ui/enhanced-track-select";
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
	trackDerivationsApi,
	trackIsrcsApi,
	trackOfficialSongsApi,
	trackPublicationsApi,
	tracksApi,
} from "@/lib/api-client";
import {
	OFFICIAL_WORK_CATEGORY_LABELS,
	OFFICIAL_WORK_CATEGORY_ORDER,
	PLATFORM_CATEGORY_LABELS,
	PLATFORM_CATEGORY_ORDER,
} from "@/lib/constants";
import { createTrackDetailHead } from "@/lib/head";
import {
	trackCreditMutations,
	trackDerivationMutations,
	trackIsrcMutations,
	trackOfficialSongMutations,
	trackPublicationMutations,
} from "@/lib/mutation-options";
import { trackDetailQueryOptions } from "@/lib/query-options";
import { getErrorMessage } from "@/lib/utils";

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

	// === Mutation Hooks ===
	// クレジット
	const creditCreateMutation = useMutation(
		trackCreditMutations.create(queryClient),
	);
	const creditUpdateMutation = useMutation(
		trackCreditMutations.update(queryClient),
	);
	const creditDeleteMutation = useMutation(
		trackCreditMutations.delete(queryClient),
	);

	// 公式楽曲
	const officialSongCreateMutation = useMutation(
		trackOfficialSongMutations.create(queryClient),
	);
	const officialSongUpdateMutation = useMutation(
		trackOfficialSongMutations.update(queryClient),
	);
	const officialSongDeleteMutation = useMutation(
		trackOfficialSongMutations.delete(queryClient),
	);
	const officialSongReorderMutation = useMutation(
		trackOfficialSongMutations.reorder(queryClient),
	);

	// 派生関係
	const derivationCreateMutation = useMutation(
		trackDerivationMutations.create(queryClient),
	);
	const derivationDeleteMutation = useMutation(
		trackDerivationMutations.delete(queryClient),
	);

	// 公開リンク
	const publicationCreateMutation = useMutation(
		trackPublicationMutations.create(queryClient),
	);
	const publicationUpdateMutation = useMutation(
		trackPublicationMutations.update(queryClient),
	);
	const publicationDeleteMutation = useMutation(
		trackPublicationMutations.delete(queryClient),
	);

	// ISRC
	const isrcCreateMutation = useMutation(
		trackIsrcMutations.create(queryClient),
	);
	const isrcUpdateMutation = useMutation(
		trackIsrcMutations.update(queryClient),
	);
	const isrcDeleteMutation = useMutation(
		trackIsrcMutations.delete(queryClient),
	);

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

	// 削除ダイアログ状態
	const [deleteCreditTarget, setDeleteCreditTarget] =
		useState<TrackCredit | null>(null);
	const [deleteOfficialSongTarget, setDeleteOfficialSongTarget] =
		useState<TrackOfficialSong | null>(null);
	const [deleteDerivationTarget, setDeleteDerivationTarget] =
		useState<TrackDerivation | null>(null);
	const [deletePublicationTarget, setDeletePublicationTarget] =
		useState<TrackPublication | null>(null);
	const [deleteIsrcTarget, setDeleteIsrcTarget] = useState<TrackIsrc | null>(
		null,
	);

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

	// 公式楽曲のグループ順序（共通定数から生成）
	const officialSongGroupOrder = useMemo(
		() =>
			OFFICIAL_WORK_CATEGORY_ORDER.map(
				(key) => OFFICIAL_WORK_CATEGORY_LABELS[key],
			),
		[],
	);

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
	};

	// クレジット追加ダイアログを閉じる
	const closeCreditDialog = () => {
		setIsCreditDialogOpen(false);
		creditCreateMutation.reset();
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
	};

	// クレジット編集ダイアログを閉じる
	const closeCreditEditDialog = () => {
		setIsCreditEditDialogOpen(false);
		setEditingCredit(null);
		creditUpdateMutation.reset();
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
	const handleCreditSubmit = () => {
		if (!track?.releaseId) return;
		const releaseId = track.releaseId;

		if (editingCredit) {
			creditUpdateMutation.mutate(
				{
					releaseId,
					trackId: track.id,
					creditId: editingCredit.id,
					data: {
						artistId: creditForm.artistId,
						artistAliasId: creditForm.artistAliasId || null,
						creditName: creditForm.creditName,
						creditPosition: creditForm.creditPosition,
						rolesCodes: creditForm.selectedRoles,
					},
				},
				{ onSuccess: () => closeCreditEditDialog() },
			);
		} else {
			creditCreateMutation.mutate(
				{
					releaseId,
					trackId: track.id,
					data: {
						id: creditForm.id,
						artistId: creditForm.artistId,
						artistAliasId: creditForm.artistAliasId || null,
						creditName: creditForm.creditName,
						creditPosition: creditForm.creditPosition,
						rolesCodes: creditForm.selectedRoles,
					},
				},
				{ onSuccess: () => closeCreditDialog() },
			);
		}
	};

	// クレジット削除
	const handleCreditDelete = () => {
		if (!deleteCreditTarget || !track?.releaseId) return;
		const releaseId = track.releaseId;

		creditDeleteMutation.mutate(
			{
				releaseId,
				trackId: track.id,
				creditId: deleteCreditTarget.id,
			},
			{ onSuccess: () => setDeleteCreditTarget(null) },
		);
	};

	// クレジット順序変更（上へ）
	const handleCreditMoveUp = async (credit: TrackCredit, index: number) => {
		if (!track?.releaseId || index === 0) return;
		const releaseId = track.releaseId;
		const sortedCredits = [...track.credits].sort(
			(a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0),
		);
		const prevCredit = sortedCredits[index - 1];

		await Promise.all([
			creditUpdateMutation.mutateAsync({
				releaseId,
				trackId: track.id,
				creditId: credit.id,
				data: { creditPosition: prevCredit.creditPosition },
			}),
			creditUpdateMutation.mutateAsync({
				releaseId,
				trackId: track.id,
				creditId: prevCredit.id,
				data: { creditPosition: credit.creditPosition },
			}),
		]);
	};

	// クレジット順序変更（下へ）
	const handleCreditMoveDown = async (credit: TrackCredit, index: number) => {
		if (!track?.releaseId) return;
		const releaseId = track.releaseId;
		const sortedCredits = [...track.credits].sort(
			(a, b) => (a.creditPosition ?? 0) - (b.creditPosition ?? 0),
		);
		if (index === sortedCredits.length - 1) return;
		const nextCredit = sortedCredits[index + 1];

		await Promise.all([
			creditUpdateMutation.mutateAsync({
				releaseId,
				trackId: track.id,
				creditId: credit.id,
				data: { creditPosition: nextCredit.creditPosition },
			}),
			creditUpdateMutation.mutateAsync({
				releaseId,
				trackId: track.id,
				creditId: nextCredit.id,
				data: { creditPosition: credit.creditPosition },
			}),
		]);
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
	};

	const closeOfficialSongDialog = () => {
		setIsOfficialSongDialogOpen(false);
		setEditingOfficialSong(null);
		officialSongCreateMutation.reset();
		officialSongUpdateMutation.reset();
	};

	const handleOfficialSongSubmit = () => {
		// 「その他」が選択されている場合はcustomSongNameを使用
		const isCustom = officialSongForm.officialSongId === "07999999";

		if (editingOfficialSong) {
			officialSongUpdateMutation.mutate(
				{
					trackId,
					officialSongId: editingOfficialSong.id,
					data: {
						partPosition: officialSongForm.partPosition,
						startSecond: officialSongForm.startSecond,
						endSecond: officialSongForm.endSecond,
						notes: officialSongForm.notes || null,
					},
				},
				{ onSuccess: () => closeOfficialSongDialog() },
			);
		} else {
			officialSongCreateMutation.mutate(
				{
					trackId,
					data: {
						id: officialSongForm.id,
						officialSongId: isCustom ? null : officialSongForm.officialSongId,
						customSongName: isCustom
							? officialSongForm.customSongName || null
							: null,
						partPosition: officialSongForm.partPosition,
						notes: officialSongForm.notes || null,
					},
				},
				{ onSuccess: () => closeOfficialSongDialog() },
			);
		}
	};

	const handleOfficialSongDelete = () => {
		if (!deleteOfficialSongTarget) return;

		officialSongDeleteMutation.mutate(
			{
				trackId,
				officialSongId: deleteOfficialSongTarget.id,
			},
			{ onSuccess: () => setDeleteOfficialSongTarget(null) },
		);
	};

	const handleOfficialSongReorder = (
		relationId: string,
		direction: "up" | "down",
	) => {
		officialSongReorderMutation.mutate({
			trackId,
			officialSongId: relationId,
			direction,
		});
	};

	// === 派生関係ハンドラー ===
	const openDerivationDialog = () => {
		setDerivationForm({
			id: createId.trackDerivation(),
			parentTrackId: "",
			notes: "",
		});
		setIsDerivationDialogOpen(true);
	};

	const closeDerivationDialog = () => {
		setIsDerivationDialogOpen(false);
		derivationCreateMutation.reset();
	};

	const handleDerivationSubmit = () => {
		derivationCreateMutation.mutate(
			{
				trackId,
				data: {
					id: derivationForm.id,
					parentTrackId: derivationForm.parentTrackId,
					notes: derivationForm.notes || null,
				},
			},
			{ onSuccess: () => closeDerivationDialog() },
		);
	};

	const handleDerivationDelete = () => {
		if (!deleteDerivationTarget) return;

		derivationDeleteMutation.mutate(
			{
				trackId,
				derivationId: deleteDerivationTarget.id,
			},
			{ onSuccess: () => setDeleteDerivationTarget(null) },
		);
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
	};

	const openPublicationEditDialog = (publication: TrackPublication) => {
		setPublicationForm({
			id: publication.id,
			platformCode: publication.platformCode,
			url: publication.url,
		});
		setEditingPublication(publication);
		setIsPublicationDialogOpen(true);
	};

	const closePublicationDialog = () => {
		setIsPublicationDialogOpen(false);
		setEditingPublication(null);
		publicationCreateMutation.reset();
		publicationUpdateMutation.reset();
	};

	const handlePublicationSubmit = () => {
		if (editingPublication) {
			publicationUpdateMutation.mutate(
				{
					trackId,
					publicationId: editingPublication.id,
					data: { url: publicationForm.url },
				},
				{ onSuccess: () => closePublicationDialog() },
			);
		} else {
			publicationCreateMutation.mutate(
				{
					trackId,
					data: {
						id: publicationForm.id,
						platformCode: publicationForm.platformCode,
						url: publicationForm.url,
					},
				},
				{ onSuccess: () => closePublicationDialog() },
			);
		}
	};

	const handlePublicationDelete = () => {
		if (!deletePublicationTarget) return;

		publicationDeleteMutation.mutate(
			{
				trackId,
				publicationId: deletePublicationTarget.id,
			},
			{ onSuccess: () => setDeletePublicationTarget(null) },
		);
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
	};

	const openIsrcEditDialog = (isrc: TrackIsrc) => {
		setIsrcForm({
			id: isrc.id,
			isrc: isrc.isrc,
			isPrimary: isrc.isPrimary,
		});
		setEditingIsrc(isrc);
		setIsIsrcDialogOpen(true);
	};

	const closeIsrcDialog = () => {
		setIsIsrcDialogOpen(false);
		setEditingIsrc(null);
		isrcCreateMutation.reset();
		isrcUpdateMutation.reset();
	};

	const handleIsrcSubmit = () => {
		if (editingIsrc) {
			isrcUpdateMutation.mutate(
				{
					trackId,
					isrcId: editingIsrc.id,
					data: { isPrimary: isrcForm.isPrimary },
				},
				{ onSuccess: () => closeIsrcDialog() },
			);
		} else {
			isrcCreateMutation.mutate(
				{
					trackId,
					data: {
						id: isrcForm.id,
						isrc: isrcForm.isrc,
						isPrimary: isrcForm.isPrimary,
					},
				},
				{ onSuccess: () => closeIsrcDialog() },
			);
		}
	};

	const handleIsrcDelete = () => {
		if (!deleteIsrcTarget) return;

		isrcDeleteMutation.mutate(
			{
				trackId,
				isrcId: deleteIsrcTarget.id,
			},
			{ onSuccess: () => setDeleteIsrcTarget(null) },
		);
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

	if (!track.releaseId) {
		return (
			<div className="container mx-auto py-6">
				<div className="alert alert-error">
					作品に紐づかないトラックの詳細表示は現在サポートされていません
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

			{/* mutation エラーは各ダイアログ内で表示 */}

			{/* トラック情報カード */}
			<div className="rounded-lg border border-base-300 bg-base-100">
				<div className="border-base-300 border-b p-4">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-xl">{track.name}</h2>
						<Button
							variant="outline"
							size="sm"
							className="gap-1"
							onClick={() => setIsEditDialogOpen(true)}
						>
							<Pencil className="h-4 w-4" />
							編集
						</Button>
					</div>
				</div>

				<div className="p-4">
					<div className="grid gap-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
							<div>
								<p className="text-base-content/70 text-sm">トラック名</p>
								<p>{track.name}</p>
							</div>
							<div>
								<p className="text-base-content/70 text-sm">トラック番号</p>
								<p>{track.trackNumber}</p>
							</div>
							<div>
								<p className="text-base-content/70 text-sm">日本語名</p>
								<p>{track.nameJa || "-"}</p>
							</div>
							<div>
								<p className="text-base-content/70 text-sm">英語名</p>
								<p>{track.nameEn || "-"}</p>
							</div>
						</div>

						<div className="border-base-300 border-t pt-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div>
									<p className="text-base-content/70 text-sm">作品</p>
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
									<p className="text-base-content/70 text-sm">ディスク</p>
									<p>
										{track.disc
											? `Disc ${track.disc.discNumber}${track.disc.discName ? ` - ${track.disc.discName}` : ""}`
											: "-"}
									</p>
								</div>
								<div>
									<p className="text-base-content/70 text-sm">イベント</p>
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
									<p className="text-base-content/70 text-sm">イベント日</p>
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
									<p className="text-base-content/70 text-sm">頒布年/月/日</p>
									<p>
										{track.release?.releaseYear ?? "-"} /{" "}
										{track.release?.releaseMonth ?? "-"} /{" "}
										{track.release?.releaseDay ?? "-"}
									</p>
								</div>
								<div>
									<p className="text-base-content/70 text-sm">作成日時</p>
									<p className="text-sm">
										{format(new Date(track.createdAt), "yyyy/MM/dd HH:mm:ss", {
											locale: ja,
										})}
									</p>
								</div>
								<div>
									<p className="text-base-content/70 text-sm">更新日時</p>
									<p className="text-sm">
										{format(new Date(track.updatedAt), "yyyy/MM/dd HH:mm:ss", {
											locale: ja,
										})}
									</p>
								</div>
							</div>
						</div>

						<div className="border-base-300 border-t pt-4">
							<p className="text-base-content/70 text-sm">ID</p>
							<p className="font-mono text-sm">{track.id}</p>
						</div>
					</div>
				</div>
			</div>

			{/* ロール別サマリー */}
			{track.credits.length > 0 && (
				<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
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
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">クレジット</h2>
					<Button
						variant="outline"
						size="sm"
						className="gap-1"
						onClick={openCreditDialog}
					>
						<Plus className="h-4 w-4" />
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
														onClick={() => setDeleteCreditTarget(credit)}
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
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<Music className="mr-2 inline-block h-4 w-4" />
						原曲紐付け
					</h2>
					<Button
						variant="outline"
						size="sm"
						className="gap-1"
						onClick={openOfficialSongDialog}
					>
						<Plus className="h-4 w-4" />
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
													<span className="ml-2 text-base-content/50 text-sm">
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
														onClick={() =>
															setDeleteOfficialSongTarget(relation)
														}
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
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<GitFork className="mr-2 inline-block h-4 w-4" />
						派生関係
					</h2>
					<Button
						variant="outline"
						size="sm"
						className="gap-1"
						onClick={openDerivationDialog}
					>
						<Plus className="h-4 w-4" />
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
														<span className="ml-1 text-base-content/70 text-sm">
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
												onClick={() => setDeleteDerivationTarget(derivation)}
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
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">
						<ExternalLink className="mr-2 inline-block h-4 w-4" />
						公開リンク
					</h2>
					<Button
						variant="outline"
						size="sm"
						className="gap-1"
						onClick={openPublicationDialog}
					>
						<Plus className="h-4 w-4" />
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
													onClick={() => setDeletePublicationTarget(pub)}
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
			<div className="mt-6 rounded-lg border border-base-300 bg-base-100">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h2 className="font-bold text-lg">ISRC</h2>
					<Button
						variant="outline"
						size="sm"
						className="gap-1"
						onClick={openIsrcDialog}
					>
						<Plus className="h-4 w-4" />
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
													onClick={() => setDeleteIsrcTarget(isrc)}
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
				<Link to="/admin/tracks" className="btn btn-outline btn-sm gap-1">
					<ArrowLeft className="h-4 w-4" />
					トラック一覧
				</Link>
				{track.release && (
					<Link
						to="/admin/releases/$id"
						params={{ id: track.release.id }}
						className="btn btn-outline btn-sm gap-1"
					>
						<Disc3 className="h-4 w-4" />
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
								<p className="text-base-content/70 text-sm">
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
					{creditCreateMutation.error && (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(creditCreateMutation.error)}
						</div>
					)}
					<DialogFooter>
						<Button variant="ghost" onClick={closeCreditDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreditSubmit}
							disabled={
								creditCreateMutation.isPending ||
								!creditForm.artistId ||
								!creditForm.creditName
							}
						>
							{creditCreateMutation.isPending ? "追加中..." : "追加"}
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
								<p className="text-base-content/70 text-sm">
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
					{creditUpdateMutation.error ? (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(creditUpdateMutation.error)}
						</div>
					) : null}
					<DialogFooter>
						<Button variant="ghost" onClick={closeCreditEditDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreditSubmit}
							disabled={
								creditUpdateMutation.isPending ||
								!creditForm.artistId ||
								!creditForm.creditName
							}
						>
							{creditUpdateMutation.isPending ? "更新中..." : "更新"}
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
					{(
						editingOfficialSong
							? officialSongUpdateMutation.error
							: officialSongCreateMutation.error
					) ? (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(
								editingOfficialSong
									? officialSongUpdateMutation.error
									: officialSongCreateMutation.error,
							)}
						</div>
					) : null}
					<DialogFooter>
						<Button variant="ghost" onClick={closeOfficialSongDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleOfficialSongSubmit}
							disabled={
								(editingOfficialSong
									? officialSongUpdateMutation.isPending
									: officialSongCreateMutation.isPending) ||
								(!editingOfficialSong && !officialSongForm.officialSongId)
							}
						>
							{(
								editingOfficialSong
									? officialSongUpdateMutation.isPending
									: officialSongCreateMutation.isPending
							)
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
				<DialogContent className="sm:max-w-[700px]">
					<DialogHeader>
						<DialogTitle>派生元トラックの追加</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>
								派生元トラック <span className="text-error">*</span>
							</Label>
							<EnhancedTrackSelect
								value={derivationForm.parentTrackId}
								onChange={(val) =>
									setDerivationForm({ ...derivationForm, parentTrackId: val })
								}
								tracks={allTracksData?.data ?? []}
								excludeTrackIds={[trackId]}
								placeholder="トラックを選択"
								searchPlaceholder="トラック名、作品名、サークル名で検索..."
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
					{derivationCreateMutation.error && (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(derivationCreateMutation.error)}
						</div>
					)}
					<DialogFooter>
						<Button variant="ghost" onClick={closeDerivationDialog}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleDerivationSubmit}
							disabled={
								derivationCreateMutation.isPending ||
								!derivationForm.parentTrackId
							}
						>
							{derivationCreateMutation.isPending ? "追加中..." : "追加"}
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
					{(
						editingPublication
							? publicationUpdateMutation.error
							: publicationCreateMutation.error
					) ? (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(
								editingPublication
									? publicationUpdateMutation.error
									: publicationCreateMutation.error,
							)}
						</div>
					) : null}
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={closePublicationDialog}
							disabled={
								editingPublication
									? publicationUpdateMutation.isPending
									: publicationCreateMutation.isPending
							}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handlePublicationSubmit}
							disabled={
								(editingPublication
									? publicationUpdateMutation.isPending
									: publicationCreateMutation.isPending) ||
								!publicationForm.platformCode ||
								!publicationForm.url
							}
						>
							{(
								editingPublication
									? publicationUpdateMutation.isPending
									: publicationCreateMutation.isPending
							)
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
								<p className="text-base-content/70 text-sm">
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
					{(
						editingIsrc
							? isrcUpdateMutation.error
							: isrcCreateMutation.error
					) ? (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(
								editingIsrc
									? isrcUpdateMutation.error
									: isrcCreateMutation.error,
							)}
						</div>
					) : null}
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={closeIsrcDialog}
							disabled={
								editingIsrc
									? isrcUpdateMutation.isPending
									: isrcCreateMutation.isPending
							}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleIsrcSubmit}
							disabled={
								(editingIsrc
									? isrcUpdateMutation.isPending
									: isrcCreateMutation.isPending) ||
								(!editingIsrc && !isrcForm.isrc)
							}
						>
							{(
								editingIsrc
									? isrcUpdateMutation.isPending
									: isrcCreateMutation.isPending
							)
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

			{/* クレジット削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteCreditTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteCreditTarget(null);
						creditDeleteMutation.reset();
					}
				}}
				title="クレジットの削除"
				description={`クレジット「${deleteCreditTarget?.creditName}」を削除しますか？この操作は取り消せません。${creditDeleteMutation.error ? `\n\nエラー: ${getErrorMessage(creditDeleteMutation.error)}` : ""}`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleCreditDelete}
				isLoading={creditDeleteMutation.isPending}
			/>

			{/* 原曲紐付け削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteOfficialSongTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteOfficialSongTarget(null);
						officialSongDeleteMutation.reset();
					}
				}}
				title="原曲紐付けの削除"
				description={`原曲紐付け「${deleteOfficialSongTarget?.officialSong?.name ?? deleteOfficialSongTarget?.customSongName ?? "不明"}」を削除しますか？この操作は取り消せません。${officialSongDeleteMutation.error ? `\n\nエラー: ${getErrorMessage(officialSongDeleteMutation.error)}` : ""}`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleOfficialSongDelete}
				isLoading={officialSongDeleteMutation.isPending}
			/>

			{/* 派生関係削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteDerivationTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteDerivationTarget(null);
						derivationDeleteMutation.reset();
					}
				}}
				title="派生関係の削除"
				description={`派生関係「${deleteDerivationTarget?.parentTrack?.name ?? deleteDerivationTarget?.parentTrackId}」を削除しますか？この操作は取り消せません。${derivationDeleteMutation.error ? `\n\nエラー: ${getErrorMessage(derivationDeleteMutation.error)}` : ""}`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDerivationDelete}
				isLoading={derivationDeleteMutation.isPending}
			/>

			{/* 公開リンク削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deletePublicationTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeletePublicationTarget(null);
						publicationDeleteMutation.reset();
					}
				}}
				title="公開リンクの削除"
				description={`公開リンク「${deletePublicationTarget?.url}」を削除しますか？この操作は取り消せません。${publicationDeleteMutation.error ? `\n\nエラー: ${getErrorMessage(publicationDeleteMutation.error)}` : ""}`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handlePublicationDelete}
				isLoading={publicationDeleteMutation.isPending}
			/>

			{/* ISRC削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteIsrcTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteIsrcTarget(null);
						isrcDeleteMutation.reset();
					}
				}}
				title="ISRCの削除"
				description={`ISRC「${deleteIsrcTarget?.isrc}」を削除しますか？この操作は取り消せません。${isrcDeleteMutation.error ? `\n\nエラー: ${getErrorMessage(isrcDeleteMutation.error)}` : ""}`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleIsrcDelete}
				isLoading={isrcDeleteMutation.isPending}
			/>
		</div>
	);
}
