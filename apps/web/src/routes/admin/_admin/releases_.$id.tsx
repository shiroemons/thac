import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowLeft,
	Barcode,
	ChevronDown,
	ChevronUp,
	Disc3,
	ExternalLink,
	Home,
	Music,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { ReleaseEditDialog } from "@/components/admin/release-edit-dialog";
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
import { Select } from "@/components/ui/select";
import {
	artistAliasesApi,
	artistsApi,
	circlesApi,
	creditRolesApi,
	type Disc,
	discsApi,
	eventDaysApi,
	eventsApi,
	PARTICIPATION_TYPE_COLORS,
	PARTICIPATION_TYPE_LABELS,
	type ParticipationType,
	platformsApi,
	RELEASE_TYPE_COLORS,
	RELEASE_TYPE_LABELS,
	type ReleaseCircleWithCircle,
	type ReleaseJanCode,
	type ReleasePublication,
	releaseCirclesApi,
	releaseJanCodesApi,
	releasePublicationsApi,
	type Track,
	type TrackCredit,
	type TrackWithCreditCount,
	trackCreditRolesApi,
	trackCreditsApi,
	tracksApi,
} from "@/lib/api-client";
import {
	COUNTRY_CODE_OPTIONS,
	PLATFORM_CATEGORY_LABELS,
	PLATFORM_CATEGORY_ORDER,
} from "@/lib/constants";
import { createReleaseDetailHead } from "@/lib/head";
import { releaseDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/releases_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(releaseDetailQueryOptions(params.id)),
	head: ({ loaderData }) => createReleaseDetailHead(loaderData?.name),
	component: ReleaseDetailPage,
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

// 参加形態のオプション
const PARTICIPATION_TYPE_OPTIONS = Object.entries(
	PARTICIPATION_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

function ReleaseDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	// 編集ダイアログ
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

	// トラック編集用
	const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] = useState<TrackWithCreditCount | null>(
		null,
	);
	const [trackForm, setTrackForm] = useState<Partial<Track>>({});

	// クレジット管理用
	const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
	const [selectedTrackForCredits, setSelectedTrackForCredits] =
		useState<TrackWithCreditCount | null>(null);
	const [editingCredit, setEditingCredit] = useState<TrackCredit | null>(null);
	const [isCreditEditDialogOpen, setIsCreditEditDialogOpen] = useState(false);
	const [creditForm, setCreditForm] = useState<{
		artistId: string;
		artistAliasId: string | null;
		creditName: string;
		creditPosition: number | null;
		selectedRoles: string[];
	}>({
		artistId: "",
		artistAliasId: null,
		creditName: "",
		creditPosition: null,
		selectedRoles: [],
	});

	// 公開リンク管理用
	const [isPublicationDialogOpen, setIsPublicationDialogOpen] = useState(false);
	const [editingPublication, setEditingPublication] =
		useState<ReleasePublication | null>(null);
	const [publicationForm, setPublicationForm] = useState<{
		platformCode: string;
		url: string;
	}>({
		platformCode: "",
		url: "",
	});

	// JANコード管理用
	const [isJanCodeDialogOpen, setIsJanCodeDialogOpen] = useState(false);
	const [editingJanCode, setEditingJanCode] = useState<ReleaseJanCode | null>(
		null,
	);
	const [janCodeForm, setJanCodeForm] = useState<{
		janCode: string;
		label: string;
		countryCode: string;
		isPrimary: boolean;
	}>({
		janCode: "",
		label: "",
		countryCode: "",
		isPrimary: false,
	});

	// 作品データ取得（SSRデータをキャッシュとして活用）
	const {
		data: release,
		isPending,
		error,
	} = useQuery(releaseDetailQueryOptions(id));

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

	// トラック一覧取得
	const { data: tracks = [] } = useQuery({
		queryKey: ["releases", id, "tracks"],
		queryFn: () => tracksApi.list(id),
		staleTime: 30_000,
		enabled: !!release,
	});

	// クレジット一覧取得（選択されたトラックに対して）
	const { data: credits = [], refetch: refetchCredits } = useQuery({
		queryKey: [
			"releases",
			id,
			"tracks",
			selectedTrackForCredits?.id,
			"credits",
		],
		queryFn: () =>
			selectedTrackForCredits
				? trackCreditsApi.list(id, selectedTrackForCredits.id)
				: Promise.resolve([]),
		staleTime: 30_000,
		enabled: !!selectedTrackForCredits,
	});

	// アーティスト一覧取得（クレジット編集ダイアログ用）
	const { data: artistsData } = useQuery({
		queryKey: ["artists", { limit: 200 }],
		queryFn: () => artistsApi.list({ limit: 200 }),
		staleTime: 60_000,
		enabled: isCreditEditDialogOpen,
	});

	// 全アーティスト別名義一覧取得
	const { data: allAliasesData } = useQuery({
		queryKey: ["artist-aliases-all", { limit: 500 }],
		queryFn: () => artistAliasesApi.list({ limit: 500 }),
		staleTime: 60_000,
		enabled: isCreditEditDialogOpen,
	});

	// 役割マスター取得
	const { data: creditRolesData } = useQuery({
		queryKey: ["credit-roles"],
		queryFn: () => creditRolesApi.list(),
		staleTime: 300_000,
		enabled: isCreditEditDialogOpen,
	});

	// 公開リンク一覧取得
	const { data: publications = [] } = useQuery({
		queryKey: ["releases", id, "publications"],
		queryFn: () => releasePublicationsApi.list(id),
		staleTime: 30_000,
		enabled: !!release,
	});

	// JANコード一覧取得
	const { data: janCodes = [] } = useQuery({
		queryKey: ["releases", id, "jan-codes"],
		queryFn: () => releaseJanCodesApi.list(id),
		staleTime: 30_000,
		enabled: !!release,
	});

	// プラットフォーム一覧取得
	const { data: platformsData } = useQuery({
		queryKey: ["platforms"],
		queryFn: () => platformsApi.list({ limit: 100 }),
		staleTime: 300_000,
		enabled: isPublicationDialogOpen,
	});

	// イベント一覧取得
	const { data: eventsData } = useQuery({
		queryKey: ["events"],
		queryFn: () => eventsApi.list({ limit: 500 }),
		staleTime: 300_000,
	});

	// イベント日一覧（選択中のイベント用）
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

	// リリースのeventIdが設定されている場合、selectedEventIdを初期化
	useEffect(() => {
		if (release?.eventId && !selectedEventId) {
			setSelectedEventId(release.eventId);
		}
	}, [release?.eventId, selectedEventId]);

	const { data: eventDaysData } = useQuery({
		queryKey: ["events", selectedEventId, "days"],
		queryFn: () =>
			selectedEventId
				? eventDaysApi.list(selectedEventId)
				: Promise.resolve([]),
		staleTime: 300_000,
		enabled: !!selectedEventId,
	});

	// イベントオプション
	const eventOptions = useMemo(() => {
		const events = eventsData?.data ?? [];
		return events.map((e) => ({
			value: e.id,
			label: e.seriesName ? `${e.seriesName} ${e.name}` : e.name,
		}));
	}, [eventsData?.data]);

	// イベント日オプション
	const eventDayOptions = useMemo(() => {
		const days = eventDaysData ?? [];
		return days.map((d) => ({
			value: d.id,
			label: `Day ${d.dayNumber} (${d.date})`,
		}));
	}, [eventDaysData]);

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

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["releases", id] });
		queryClient.invalidateQueries({ queryKey: ["releases", id, "circles"] });
		queryClient.invalidateQueries({ queryKey: ["releases", id, "tracks"] });
		queryClient.invalidateQueries({
			queryKey: ["releases", id, "publications"],
		});
		queryClient.invalidateQueries({ queryKey: ["releases", id, "jan-codes"] });
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
					id: createId.disc(),
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

	// トラック関連
	const openTrackDialog = (track?: TrackWithCreditCount) => {
		if (track) {
			setEditingTrack(track);
			setTrackForm({
				trackNumber: track.trackNumber,
				name: track.name,
				nameJa: track.nameJa,
				nameEn: track.nameEn,
				discId: track.discId,
			});
		} else {
			setEditingTrack(null);
			// 次のトラック番号を自動設定（ディスクなしトラックの最大値+1）
			const tracksWithoutDisc = tracks.filter((t) => !t.discId);
			const nextTrackNumber =
				tracksWithoutDisc.length > 0
					? Math.max(...tracksWithoutDisc.map((t) => t.trackNumber)) + 1
					: 1;
			setTrackForm({
				trackNumber: nextTrackNumber,
				name: "",
				nameJa: null,
				nameEn: null,
				discId: null,
			});
		}
		setIsTrackDialogOpen(true);
	};

	const handleTrackSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingTrack) {
				await tracksApi.update(id, editingTrack.id, {
					trackNumber: trackForm.trackNumber,
					name: trackForm.name,
					nameJa: trackForm.nameJa || null,
					nameEn: trackForm.nameEn || null,
					discId: trackForm.discId || null,
					eventId: null,
					eventDayId: null,
				});
			} else {
				await tracksApi.create(id, {
					id: createId.track(),
					trackNumber: trackForm.trackNumber ?? 1,
					name: trackForm.name ?? "",
					nameJa: trackForm.nameJa || null,
					nameEn: trackForm.nameEn || null,
					discId: trackForm.discId || null,
					eventId: null,
					eventDayId: null,
				});
			}
			invalidateQuery();
			setIsTrackDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleTrackDelete = async (track: TrackWithCreditCount) => {
		if (
			!confirm(
				`トラック "${track.name}" を削除しますか？関連するクレジット情報も削除されます。`,
			)
		) {
			return;
		}
		try {
			await tracksApi.delete(id, track.id);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	const handleTrackMoveUp = async (
		track: TrackWithCreditCount,
		index: number,
		_scopeTracks: TrackWithCreditCount[],
	) => {
		if (index === 0) return;
		try {
			await tracksApi.reorder(id, track.id, "up");
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "順序変更に失敗しました");
		}
	};

	const handleTrackMoveDown = async (
		track: TrackWithCreditCount,
		index: number,
		scopeTracks: TrackWithCreditCount[],
	) => {
		if (index === scopeTracks.length - 1) return;
		try {
			await tracksApi.reorder(id, track.id, "down");
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "順序変更に失敗しました");
		}
	};

	// クレジット関連
	const openCreditDialog = (track: TrackWithCreditCount) => {
		setSelectedTrackForCredits(track);
		setIsCreditDialogOpen(true);
	};

	const closeCreditDialog = () => {
		setIsCreditDialogOpen(false);
		setSelectedTrackForCredits(null);
	};

	const openCreditEditDialog = (credit?: TrackCredit) => {
		if (credit) {
			setEditingCredit(credit);
			setCreditForm({
				artistId: credit.artistId,
				artistAliasId: credit.artistAliasId,
				creditName: credit.creditName,
				creditPosition: credit.creditPosition,
				selectedRoles: credit.roles.map((r) => r.roleCode),
			});
		} else {
			setEditingCredit(null);
			// 次のポジションを自動計算
			const nextPosition =
				credits.length > 0
					? Math.max(...credits.map((c) => c.creditPosition ?? 0), 0) + 1
					: 1;
			setCreditForm({
				artistId: "",
				artistAliasId: null,
				creditName: "",
				creditPosition: nextPosition,
				selectedRoles: [],
			});
		}
		setIsCreditEditDialogOpen(true);
	};

	const closeCreditEditDialog = () => {
		setIsCreditEditDialogOpen(false);
		setEditingCredit(null);
		setMutationError(null);
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
				artistAliasId: null,
				creditName: "",
			});
		}
	};

	// 現在の選択値を取得（artistAliasIdをそのまま使用）
	const getCurrentCreditNameOptionValue = () => {
		return creditForm.artistAliasId || "";
	};

	// 役割のトグル
	const handleRoleToggle = (roleCode: string) => {
		setCreditForm((prev) => ({
			...prev,
			selectedRoles: prev.selectedRoles.includes(roleCode)
				? prev.selectedRoles.filter((r) => r !== roleCode)
				: [...prev.selectedRoles, roleCode],
		}));
	};

	const handleCreditSubmit = async () => {
		if (!selectedTrackForCredits) return;

		setIsSubmitting(true);
		setMutationError(null);
		try {
			let creditId: string;

			if (editingCredit) {
				// 更新
				await trackCreditsApi.update(
					id,
					selectedTrackForCredits.id,
					editingCredit.id,
					{
						artistId: creditForm.artistId,
						creditName: creditForm.creditName,
						artistAliasId: creditForm.artistAliasId,
						creditPosition: creditForm.creditPosition,
					},
				);
				creditId = editingCredit.id;

				// 既存の役割を削除
				for (const role of editingCredit.roles) {
					await trackCreditRolesApi.remove(
						id,
						selectedTrackForCredits.id,
						creditId,
						role.roleCode,
						role.rolePosition,
					);
				}
			} else {
				// 新規作成
				creditId = createId.trackCredit();
				await trackCreditsApi.create(id, selectedTrackForCredits.id, {
					id: creditId,
					artistId: creditForm.artistId,
					creditName: creditForm.creditName,
					artistAliasId: creditForm.artistAliasId,
					creditPosition: creditForm.creditPosition,
				});
			}

			// 役割を追加
			for (let i = 0; i < creditForm.selectedRoles.length; i++) {
				await trackCreditRolesApi.add(
					id,
					selectedTrackForCredits.id,
					creditId,
					{
						roleCode: creditForm.selectedRoles[i],
						rolePosition: i + 1,
					},
				);
			}

			await refetchCredits();
			invalidateQuery();
			closeCreditEditDialog();
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCreditDelete = async (credit: TrackCredit) => {
		if (!selectedTrackForCredits) return;

		if (
			!confirm(
				`クレジット "${credit.creditName}" を削除しますか？関連する役割情報も削除されます。`,
			)
		) {
			return;
		}
		try {
			await trackCreditsApi.delete(id, selectedTrackForCredits.id, credit.id);
			await refetchCredits();
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// 公開リンク関連
	const openPublicationDialog = (publication?: ReleasePublication) => {
		if (publication) {
			setEditingPublication(publication);
			setPublicationForm({
				platformCode: publication.platformCode,
				url: publication.url,
			});
		} else {
			setEditingPublication(null);
			setPublicationForm({
				platformCode: "",
				url: "",
			});
		}
		setIsPublicationDialogOpen(true);
	};

	const handlePublicationSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingPublication) {
				await releasePublicationsApi.update(id, editingPublication.id, {
					url: publicationForm.url,
				});
			} else {
				await releasePublicationsApi.create(id, {
					id: createId.releasePublication(),
					platformCode: publicationForm.platformCode,
					url: publicationForm.url,
				});
			}
			invalidateQuery();
			setIsPublicationDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePublicationDelete = async (publication: ReleasePublication) => {
		if (!confirm("この公開リンクを削除しますか？")) {
			return;
		}
		try {
			await releasePublicationsApi.delete(id, publication.id);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// JANコード関連
	const openJanCodeDialog = (janCode?: ReleaseJanCode) => {
		if (janCode) {
			setEditingJanCode(janCode);
			setJanCodeForm({
				janCode: janCode.janCode,
				label: janCode.label || "",
				countryCode: janCode.countryCode || "",
				isPrimary: janCode.isPrimary || false,
			});
		} else {
			setEditingJanCode(null);
			// 既存に主要がなければデフォルトで主要にする
			const hasPrimary = janCodes.some((jc) => jc.isPrimary);
			setJanCodeForm({
				janCode: "",
				label: "",
				countryCode: "JP",
				isPrimary: !hasPrimary,
			});
		}
		setIsJanCodeDialogOpen(true);
	};

	const handleJanCodeSubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingJanCode) {
				await releaseJanCodesApi.update(id, editingJanCode.id, {
					label: janCodeForm.label || null,
					countryCode: janCodeForm.countryCode || null,
					isPrimary: janCodeForm.isPrimary,
				});
			} else {
				await releaseJanCodesApi.create(id, {
					id: createId.releaseJanCode(),
					janCode: janCodeForm.janCode,
					label: janCodeForm.label || null,
					countryCode: janCodeForm.countryCode || null,
					isPrimary: janCodeForm.isPrimary,
				});
			}
			invalidateQuery();
			setIsJanCodeDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleJanCodeDelete = async (janCode: ReleaseJanCode) => {
		if (!confirm(`JANコード "${janCode.janCode}" を削除しますか？`)) {
			return;
		}
		try {
			await releaseJanCodesApi.delete(id, janCode.id);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// ローディング（キャッシュがない場合のみスケルトンを表示）
	if (isPending && !release) {
		return <DetailPageSkeleton showBadge cardCount={3} fieldsPerCard={6} />;
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
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
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
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsEditDialogOpen(true)}
				>
					<Pencil className="mr-2 h-4 w-4" />
					編集
				</Button>
			</div>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

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
						<div>
							<Label className="text-base-content/60">発売年/月/日</Label>
							<p>
								{release.releaseYear ?? "-"} / {release.releaseMonth ?? "-"} /{" "}
								{release.releaseDay ?? "-"}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">イベント</Label>
							<p>
								{release.eventId ? (
									<Link
										to="/admin/events/$id"
										params={{ id: release.eventId }}
										className="text-primary hover:underline"
									>
										{eventOptions.find((e) => e.value === release.eventId)
											?.label || release.eventId}
									</Link>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">イベント日</Label>
							<p>
								{release.eventDayId
									? eventDayOptions.find((d) => d.value === release.eventDayId)
											?.label || release.eventDayId
									: "-"}
							</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">メモ</Label>
							<p className="whitespace-pre-wrap">{release.notes || "-"}</p>
						</div>
					</div>
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
										<th className="w-[100px]">並び替え</th>
										<th>サークル名</th>
										<th>参加形態</th>
										<th className="w-[70px]" />
									</tr>
								</thead>
								<tbody>
									{releaseCircles.map((rc, index) => (
										<tr key={`${rc.circleId}-${rc.participationType}`}>
											<td className="w-[100px]">
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCircleMoveUp(rc, index)}
														disabled={index === 0}
														title="上へ移動"
													>
														<ChevronUp className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCircleMoveDown(rc, index)}
														disabled={index === releaseCircles.length - 1}
														title="下へ移動"
													>
														<ChevronDown className="h-4 w-4" />
													</Button>
												</div>
											</td>
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

			{/* 公開リンクカード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<ExternalLink className="h-5 w-5" />
							公開リンク
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => openPublicationDialog()}
						>
							<Plus className="mr-2 h-4 w-4" />
							リンク追加
						</Button>
					</div>

					{publications.length === 0 ? (
						<p className="text-base-content/60">
							公開リンクが登録されていません
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>プラットフォーム</th>
										<th>URL</th>
										<th className="w-24">操作</th>
									</tr>
								</thead>
								<tbody>
									{publications.map((pub) => (
										<tr key={pub.id}>
											<td>
												<Badge variant="primary">
													{pub.platform?.name || pub.platformCode}
												</Badge>
											</td>
											<td>
												<a
													href={pub.url}
													target="_blank"
													rel="noopener noreferrer"
													className="link link-primary text-sm"
												>
													{pub.url.length > 50
														? `${pub.url.substring(0, 50)}...`
														: pub.url}
												</a>
											</td>
											<td>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openPublicationDialog(pub)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handlePublicationDelete(pub)}
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

			{/* JANコードカード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Barcode className="h-5 w-5" />
							JANコード
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => openJanCodeDialog()}
						>
							<Plus className="mr-2 h-4 w-4" />
							JANコード追加
						</Button>
					</div>

					{janCodes.length === 0 ? (
						<p className="text-base-content/60">
							JANコードが登録されていません
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>JANコード</th>
										<th>ラベル</th>
										<th>国コード</th>
										<th>主要</th>
										<th className="w-24">操作</th>
									</tr>
								</thead>
								<tbody>
									{janCodes.map((jc) => (
										<tr key={jc.id}>
											<td className="font-mono">{jc.janCode}</td>
											<td>{jc.label || "-"}</td>
											<td>{jc.countryCode || "-"}</td>
											<td>
												{jc.isPrimary && <Badge variant="primary">主要</Badge>}
											</td>
											<td>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openJanCodeDialog(jc)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleJanCodeDelete(jc)}
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

			{/* トラック一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Music className="h-5 w-5" />
							トラック一覧
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => openTrackDialog()}
						>
							<Plus className="mr-2 h-4 w-4" />
							トラック追加
						</Button>
					</div>

					{tracks.length === 0 ? (
						<p className="text-base-content/60">トラックが登録されていません</p>
					) : (
						<div className="space-y-6">
							{/* ディスクごとにグループ化 */}
							{release?.discs
								.sort((a, b) => a.discNumber - b.discNumber)
								.map((disc) => {
									const discTracks = tracks
										.filter((t) => t.discId === disc.id)
										.sort((a, b) => a.trackNumber - b.trackNumber);
									if (discTracks.length === 0) return null;
									return (
										<div key={disc.id}>
											<h3 className="mb-2 font-medium text-base-content/80">
												Disc {disc.discNumber}
												{disc.discName && ` - ${disc.discName}`}
											</h3>
											<div className="overflow-x-auto">
												<table className="table">
													<thead>
														<tr>
															<th className="w-[100px]">並び替え</th>
															<th className="w-[60px]">No.</th>
															<th>トラック名</th>
															<th className="w-[100px]">クレジット数</th>
															<th className="w-[70px]" />
														</tr>
													</thead>
													<tbody>
														{discTracks.map((track, index) => (
															<tr key={track.id}>
																<td className="w-[100px]">
																	<div className="flex items-center gap-1">
																		<Button
																			variant="ghost"
																			size="icon"
																			onClick={() =>
																				handleTrackMoveUp(
																					track,
																					index,
																					discTracks,
																				)
																			}
																			disabled={index === 0}
																			title="上へ移動"
																		>
																			<ChevronUp className="h-4 w-4" />
																		</Button>
																		<Button
																			variant="ghost"
																			size="icon"
																			onClick={() =>
																				handleTrackMoveDown(
																					track,
																					index,
																					discTracks,
																				)
																			}
																			disabled={index === discTracks.length - 1}
																			title="下へ移動"
																		>
																			<ChevronDown className="h-4 w-4" />
																		</Button>
																	</div>
																</td>
																<td>{track.trackNumber}</td>
																<td>
																	<div>
																		<Link
																			to="/admin/tracks/$id"
																			params={{ id: track.id }}
																			className="text-primary hover:underline"
																		>
																			{track.name}
																		</Link>
																		{track.nameJa && (
																			<p className="text-base-content/60 text-sm">
																				{track.nameJa}
																			</p>
																		)}
																	</div>
																</td>
																<td>
																	<Badge variant="ghost">
																		{track.creditCount}件
																	</Badge>
																</td>
																<td>
																	<div className="flex items-center gap-1">
																		<Button
																			variant="ghost"
																			size="icon"
																			onClick={() => openTrackDialog(track)}
																		>
																			<Pencil className="h-4 w-4" />
																			<span className="sr-only">編集</span>
																		</Button>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="text-error hover:text-error"
																			onClick={() => handleTrackDelete(track)}
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
										</div>
									);
								})}

							{/* ディスクなしトラック */}
							{(() => {
								const tracksWithoutDisc = tracks
									.filter((t) => !t.discId)
									.sort((a, b) => a.trackNumber - b.trackNumber);
								if (tracksWithoutDisc.length === 0) return null;
								return (
									<div>
										<h3 className="mb-2 font-medium text-base-content/80">
											単曲
										</h3>
										<div className="overflow-x-auto">
											<table className="table">
												<thead>
													<tr>
														<th className="w-[100px]">並び替え</th>
														<th className="w-[60px]">No.</th>
														<th>トラック名</th>
														<th className="w-[100px]">クレジット数</th>
														<th className="w-[70px]" />
													</tr>
												</thead>
												<tbody>
													{tracksWithoutDisc.map((track, index) => (
														<tr key={track.id}>
															<td className="w-[100px]">
																<div className="flex items-center gap-1">
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() =>
																			handleTrackMoveUp(
																				track,
																				index,
																				tracksWithoutDisc,
																			)
																		}
																		disabled={index === 0}
																		title="上へ移動"
																	>
																		<ChevronUp className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() =>
																			handleTrackMoveDown(
																				track,
																				index,
																				tracksWithoutDisc,
																			)
																		}
																		disabled={
																			index === tracksWithoutDisc.length - 1
																		}
																		title="下へ移動"
																	>
																		<ChevronDown className="h-4 w-4" />
																	</Button>
																</div>
															</td>
															<td>{track.trackNumber}</td>
															<td>
																<div>
																	<Link
																		to="/admin/tracks/$id"
																		params={{ id: track.id }}
																		className="text-primary hover:underline"
																	>
																		{track.name}
																	</Link>
																	{track.nameJa && (
																		<p className="text-base-content/60 text-sm">
																			{track.nameJa}
																		</p>
																	)}
																</div>
															</td>
															<td>
																<button
																	type="button"
																	onClick={() => openCreditDialog(track)}
																	className="badge badge-ghost hover:badge-primary cursor-pointer transition-colors"
																>
																	{track.creditCount}件
																</button>
															</td>
															<td>
																<div className="flex items-center gap-1">
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => openTrackDialog(track)}
																	>
																		<Pencil className="h-4 w-4" />
																		<span className="sr-only">編集</span>
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="text-error hover:text-error"
																		onClick={() => handleTrackDelete(track)}
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
									</div>
								);
							})()}
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

			{/* トラック編集ダイアログ */}
			<Dialog open={isTrackDialogOpen} onOpenChange={setIsTrackDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingTrack ? "トラックの編集" : "トラックの追加"}
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
								トラック名 <span className="text-error">*</span>
							</Label>
							<Input
								value={trackForm.name || ""}
								onChange={(e) => {
									const newName = e.target.value;
									setTrackForm({
										...trackForm,
										name: newName,
										// 日本語名が空または以前のトラック名と同じ場合は連動
										nameJa:
											!trackForm.nameJa || trackForm.nameJa === trackForm.name
												? newName
												: trackForm.nameJa,
									});
								}}
								placeholder="トラック名を入力"
							/>
						</div>
						<div className="grid gap-2">
							<Label>日本語名</Label>
							<Input
								value={trackForm.nameJa || ""}
								onChange={(e) =>
									setTrackForm({ ...trackForm, nameJa: e.target.value })
								}
								placeholder="日本語名を入力"
							/>
						</div>
						<div className="grid gap-2">
							<Label>英語名</Label>
							<Input
								value={trackForm.nameEn || ""}
								onChange={(e) =>
									setTrackForm({ ...trackForm, nameEn: e.target.value })
								}
								placeholder="英語名を入力"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>
									トラック番号 <span className="text-error">*</span>
								</Label>
								<Input
									type="number"
									min={1}
									value={trackForm.trackNumber ?? ""}
									onChange={(e) =>
										setTrackForm({
											...trackForm,
											trackNumber: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label>ディスク</Label>
								<Select
									value={trackForm.discId || ""}
									onChange={(e) =>
										setTrackForm({
											...trackForm,
											discId: e.target.value || null,
										})
									}
								>
									<option value="">なし（単曲）</option>
									{release?.discs
										.sort((a, b) => a.discNumber - b.discNumber)
										.map((disc) => (
											<option key={disc.id} value={disc.id}>
												Disc {disc.discNumber}
												{disc.discName && ` - ${disc.discName}`}
											</option>
										))}
								</Select>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsTrackDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleTrackSubmit}
							disabled={isSubmitting || !trackForm.name}
						>
							{isSubmitting
								? editingTrack
									? "更新中..."
									: "追加中..."
								: editingTrack
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* クレジット一覧ダイアログ */}
			<Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
				<DialogContent className="sm:max-w-[700px]">
					<DialogHeader>
						<DialogTitle>
							クレジット管理: {selectedTrackForCredits?.name}
						</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<div className="mb-4 flex items-center justify-between">
							<span className="text-base-content/60 text-sm">
								{credits.length}件のクレジット
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => openCreditEditDialog()}
							>
								<Plus className="mr-2 h-4 w-4" />
								クレジット追加
							</Button>
						</div>

						{credits.length === 0 ? (
							<p className="py-8 text-center text-base-content/60">
								クレジットが登録されていません
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="table">
									<thead>
										<tr>
											<th>盤面表記</th>
											<th>アーティスト</th>
											<th>役割</th>
											<th className="w-[70px]" />
										</tr>
									</thead>
									<tbody>
										{credits
											.sort(
												(a, b) =>
													(a.creditPosition ?? 0) - (b.creditPosition ?? 0),
											)
											.map((credit) => (
												<tr key={credit.id}>
													<td>
														<div>
															<p className="font-medium">{credit.creditName}</p>
															{credit.artistAlias && (
																<p className="text-base-content/60 text-xs">
																	名義
																</p>
															)}
														</div>
													</td>
													<td>
														<p>{credit.artist?.name ?? "-"}</p>
													</td>
													<td>
														<div className="flex flex-wrap gap-1">
															{credit.roles.length > 0 ? (
																credit.roles
																	.sort(
																		(a, b) => a.rolePosition - b.rolePosition,
																	)
																	.map((role) => (
																		<Badge
																			key={`${role.roleCode}-${role.rolePosition}`}
																			variant={getRoleBadgeVariant(
																				role.roleCode,
																			)}
																		>
																			{role.role?.label ?? role.roleCode}
																		</Badge>
																	))
															) : (
																<span className="text-base-content/40">-</span>
															)}
														</div>
													</td>
													<td>
														<div className="flex items-center gap-1">
															<Button
																variant="ghost"
																size="icon"
																onClick={() => openCreditEditDialog(credit)}
															>
																<Pencil className="h-4 w-4" />
																<span className="sr-only">編集</span>
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="text-error hover:text-error"
																onClick={() => handleCreditDelete(credit)}
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
					<DialogFooter>
						<Button variant="ghost" onClick={closeCreditDialog}>
							閉じる
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* クレジット編集ダイアログ */}
			<Dialog
				open={isCreditEditDialogOpen}
				onOpenChange={setIsCreditEditDialogOpen}
			>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>
							{editingCredit ? "クレジットの編集" : "クレジットの追加"}
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
								アーティスト名義 <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={getCurrentCreditNameOptionValue()}
								onChange={(value) => handleCreditNameOptionChange(value || "")}
								options={creditNameOptions.map((opt) => ({
									value: opt.value,
									label: opt.label,
								}))}
								placeholder="アーティスト名義を選択"
								searchPlaceholder="アーティスト名義を検索..."
								emptyMessage="アーティスト名義が見つかりません"
								clearable={false}
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
							<p className="text-base-content/60 text-xs">
								アーティスト名義から自動入力されます。必要に応じて編集してください。
							</p>
						</div>

						<div className="grid gap-2">
							<Label>表示順</Label>
							<Input
								type="number"
								min={1}
								value={creditForm.creditPosition ?? ""}
								onChange={(e) =>
									setCreditForm({
										...creditForm,
										creditPosition: e.target.value
											? Number(e.target.value)
											: null,
									})
								}
								placeholder="表示順（任意）"
							/>
						</div>

						<div className="grid gap-2">
							<Label>役割</Label>
							<div className="flex flex-wrap gap-2 rounded-md border border-base-300 p-3">
								{creditRolesData?.data.map((role) => (
									<label
										key={role.code}
										className={`badge cursor-pointer transition-colors ${
											creditForm.selectedRoles.includes(role.code)
												? "badge-primary"
												: "badge-ghost hover:badge-outline"
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
							<p className="text-base-content/60 text-xs">
								選択した順序で役割が表示されます。
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={closeCreditEditDialog}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreditSubmit}
							disabled={
								isSubmitting || !creditForm.artistId || !creditForm.creditName
							}
						>
							{isSubmitting
								? editingCredit
									? "更新中..."
									: "追加中..."
								: editingCredit
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 公開リンク編集ダイアログ */}
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
							onClick={() => setIsPublicationDialogOpen(false)}
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

			{/* JANコード編集ダイアログ */}
			<Dialog open={isJanCodeDialogOpen} onOpenChange={setIsJanCodeDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingJanCode ? "JANコードの編集" : "JANコードの追加"}
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
								JANコード <span className="text-error">*</span>
							</Label>
							<Input
								value={janCodeForm.janCode}
								onChange={(e) =>
									setJanCodeForm({
										...janCodeForm,
										janCode: e.target.value.replace(/\D/g, ""),
									})
								}
								placeholder="4900000000000"
								maxLength={13}
								disabled={!!editingJanCode}
								className="font-mono"
							/>
							<p className="text-base-content/60 text-xs">
								8桁または13桁の数字（編集時は変更不可）
							</p>
						</div>

						{editingJanCode && (
							<>
								<div className="grid gap-2">
									<Label>ラベル</Label>
									<Input
										value={janCodeForm.label}
										onChange={(e) =>
											setJanCodeForm({
												...janCodeForm,
												label: e.target.value,
											})
										}
										placeholder="通常版、限定版など"
									/>
								</div>

								<div className="grid gap-2">
									<Label>国コード</Label>
									<select
										value={janCodeForm.countryCode}
										onChange={(e) =>
											setJanCodeForm({
												...janCodeForm,
												countryCode: e.target.value,
											})
										}
										className="select select-bordered w-full"
									>
										<option value="">選択してください</option>
										{COUNTRY_CODE_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</div>
							</>
						)}

						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								className="checkbox"
								checked={janCodeForm.isPrimary}
								onChange={(e) =>
									setJanCodeForm({
										...janCodeForm,
										isPrimary: e.target.checked,
									})
								}
							/>
							<span>主要JANとして設定</span>
						</label>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsJanCodeDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleJanCodeSubmit}
							disabled={
								isSubmitting ||
								(!editingJanCode &&
									janCodeForm.janCode.length !== 8 &&
									janCodeForm.janCode.length !== 13)
							}
						>
							{isSubmitting
								? editingJanCode
									? "更新中..."
									: "追加中..."
								: editingJanCode
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* リリース編集ダイアログ */}
			<ReleaseEditDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				release={release}
				onSuccess={invalidateQuery}
			/>
		</div>
	);
}
