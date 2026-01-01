import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	isConflictError,
	type OfficialSong,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SearchableGroupedSelect } from "../ui/searchable-grouped-select";
import { SearchableSelect } from "../ui/searchable-select";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ConflictDialog } from "./conflict-dialog";

export interface OfficialSongFormData {
	id: string;
	officialWorkId: string | null;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	sourceSongId: string | null;
	notes: string | null;
}

export interface OfficialSongEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	song?: OfficialSong | null;
	onSuccess?: () => void;
}

export function OfficialSongEditDialog({
	open,
	onOpenChange,
	mode,
	song,
	onSuccess,
}: OfficialSongEditDialogProps) {
	const [form, setForm] = useState<OfficialSongFormData>({
		id: "",
		officialWorkId: null,
		trackNumber: null,
		name: "",
		nameJa: "",
		nameEn: null,
		composerName: null,
		arrangerName: null,
		isOriginal: true,
		sourceSongId: null,
		notes: null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<OfficialSong>();

	// 作品一覧を取得
	const { data: worksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 300_000,
	});

	// 楽曲一覧を取得（原曲選択用・ID生成用）
	const { data: allSongsData } = useQuery({
		queryKey: ["officialSongs", "all"],
		queryFn: () => officialSongsApi.list({ limit: 5000 }),
		staleTime: 60_000,
	});

	// 次の楽曲IDを生成
	const generateNextSongId = (workId: string): string => {
		if (!workId) return "";

		const allSongs = allSongsData?.data ?? [];
		const workSongs = allSongs.filter((s) => s.officialWorkId === workId);

		if (workSongs.length === 0) {
			return `${workId}0001`;
		}

		const maxTrackNumber = Math.max(
			...workSongs.map((s) => {
				const trackPart = s.id.slice(4);
				const num = Number.parseInt(trackPart, 10);
				return Number.isNaN(num) ? 0 : num;
			}),
		);

		const nextNumber = (maxTrackNumber + 1).toString().padStart(4, "0");
		return `${workId}${nextNumber}`;
	};

	// 作品選択肢（カテゴリ別グループ）
	const workGroups = useMemo(() => {
		const works = worksData?.data ?? [];
		const categories = categoriesData?.data ?? [];

		// カテゴリコードをラベルにマッピング
		const categoryMap = new Map(categories.map((c) => [c.code, c.name]));

		// 作品をカテゴリ別にグループ化
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

		// カテゴリ順にソートしてグループ配列を作成
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
			.filter((s) => s.id !== form.id)
			.map((s) => ({
				value: s.id,
				label: `${s.nameJa} (${s.workName || "作品なし"})`,
			}));
	}, [allSongsData, form.id]);

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && song) {
				setForm({
					id: song.id,
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
				setOriginalUpdatedAt(song.updatedAt);
			} else {
				setForm({
					id: "",
					officialWorkId: null,
					trackNumber: null,
					name: "",
					nameJa: "",
					nameEn: null,
					composerName: null,
					arrangerName: null,
					isOriginal: true,
					sourceSongId: null,
					notes: null,
				});
				setOriginalUpdatedAt(null);
			}
			setError(null);
			clearConflict();
		}
	}, [open, mode, song, clearConflict]);

	const handleWorkChange = (workId: string | null) => {
		if (mode === "create" && workId) {
			const nextId = generateNextSongId(workId);
			setForm({ ...form, officialWorkId: workId, id: nextId });
		} else {
			setForm({ ...form, officialWorkId: workId });
		}
	};

	const handleSubmit = async (overrideUpdatedAt?: string) => {
		if (!form.name || !form.nameJa) {
			setError("名前と日本語名は必須です");
			return;
		}

		if (mode === "create" && !form.id) {
			setError("作品を選択してIDを生成してください");
			return;
		}

		// 自己参照チェック
		if (!form.isOriginal && form.sourceSongId === form.id) {
			setError("自身を原曲に指定することはできません");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				await officialSongsApi.create({
					id: form.id,
					officialWorkId: form.officialWorkId,
					trackNumber: form.trackNumber,
					name: form.name,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					composerName: form.composerName,
					arrangerName: form.arrangerName,
					isOriginal: form.isOriginal,
					sourceSongId: form.isOriginal ? null : form.sourceSongId,
					notes: form.notes,
				});
			} else if (song) {
				await officialSongsApi.update(song.id, {
					officialWorkId: form.officialWorkId,
					trackNumber: form.trackNumber,
					name: form.name,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					composerName: form.composerName,
					arrangerName: form.arrangerName,
					isOriginal: form.isOriginal,
					sourceSongId: form.isOriginal ? null : form.sourceSongId,
					notes: form.notes,
					// 楽観的ロック: updatedAtを送信
					updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<OfficialSong>(e)) {
				setConflict(e.current);
				return;
			}
			setError(
				e instanceof Error
					? e.message
					: mode === "create"
						? "作成に失敗しました"
						: "更新に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: OfficialSong) => {
		setForm({
			id: data.id,
			officialWorkId: data.officialWorkId,
			trackNumber: data.trackNumber,
			name: data.name,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			composerName: data.composerName,
			arrangerName: data.arrangerName,
			isOriginal: data.isOriginal,
			sourceSongId: data.sourceSongId,
			notes: data.notes,
		});
		setOriginalUpdatedAt(data.updatedAt);
		clearConflict();
	};

	// 競合ダイアログで「上書き」を選択した場合
	const handleOverwrite = () => {
		if (conflictState.conflictData) {
			// 最新のupdatedAtで再送信
			handleSubmit(conflictState.conflictData.updatedAt);
			clearConflict();
		}
	};

	const title = mode === "create" ? "新規公式楽曲" : "公式楽曲の編集";

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{error && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{error}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="song-id">
								ID {mode === "create" && "(自動生成)"}
							</Label>
							<Input
								id="song-id"
								value={form.id}
								disabled
								className="font-mono"
							/>
						</div>
						<div className="grid gap-2">
							<Label>作品</Label>
							<SearchableGroupedSelect
								value={form.officialWorkId || ""}
								onChange={(val) => handleWorkChange(val || null)}
								groups={workGroups}
								placeholder="作品を選択..."
								searchPlaceholder="作品を検索..."
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="song-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="song-name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: A Sacred Lot"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="song-nameJa">
									日本語名 <span className="text-error">*</span>
								</Label>
								<Input
									id="song-nameJa"
									value={form.nameJa}
									onChange={(e) => setForm({ ...form, nameJa: e.target.value })}
									placeholder="例: A Sacred Lot"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="song-nameEn">英語名</Label>
								<Input
									id="song-nameEn"
									value={form.nameEn || ""}
									onChange={(e) =>
										setForm({ ...form, nameEn: e.target.value || null })
									}
									placeholder="例: A Sacred Lot"
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="song-trackNumber">トラック番号</Label>
								<Input
									id="song-trackNumber"
									type="number"
									value={form.trackNumber ?? ""}
									onChange={(e) =>
										setForm({
											...form,
											trackNumber: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 1"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="song-isOriginal">オリジナル曲</Label>
								<Select
									id="song-isOriginal"
									value={form.isOriginal ? "true" : "false"}
									onChange={(e) =>
										setForm({
											...form,
											isOriginal: e.target.value === "true",
											sourceSongId:
												e.target.value === "true" ? null : form.sourceSongId,
										})
									}
									disabled={isSubmitting}
								>
									<option value="true">はい</option>
									<option value="false">いいえ（アレンジ曲）</option>
								</Select>
							</div>
						</div>
						{!form.isOriginal && (
							<div className="grid gap-2">
								<Label>原曲</Label>
								<SearchableSelect
									value={form.sourceSongId || ""}
									onChange={(val) =>
										setForm({ ...form, sourceSongId: val || null })
									}
									options={sourceSongOptions}
									placeholder="原曲を選択..."
									searchPlaceholder="楽曲を検索..."
									emptyMessage="楽曲が見つかりません"
									disabled={isSubmitting}
								/>
							</div>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="song-composerName">作曲者</Label>
								<Input
									id="song-composerName"
									value={form.composerName || ""}
									onChange={(e) =>
										setForm({ ...form, composerName: e.target.value || null })
									}
									placeholder="例: ZUN"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="song-arrangerName">編曲者</Label>
								<Input
									id="song-arrangerName"
									value={form.arrangerName || ""}
									onChange={(e) =>
										setForm({ ...form, arrangerName: e.target.value || null })
									}
									placeholder="例: ZUN"
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="song-notes">備考</Label>
							<Textarea
								id="song-notes"
								value={form.notes || ""}
								onChange={(e) =>
									setForm({ ...form, notes: e.target.value || null })
								}
								placeholder="例: アレンジバージョン、特記事項など"
								rows={3}
								disabled={isSubmitting}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => handleSubmit()}
							disabled={isSubmitting || !form.name || !form.nameJa}
						>
							{isSubmitting
								? mode === "create"
									? "作成中..."
									: "保存中..."
								: mode === "create"
									? "作成"
									: "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 楽観的ロック競合ダイアログ */}
			<ConflictDialog
				open={conflictState.isConflict}
				onOpenChange={(open) => !open && clearConflict()}
				currentData={conflictState.conflictData}
				getDisplayName={(data) => data.nameJa}
				onOverwrite={handleOverwrite}
				onContinueEditing={handleContinueEditing}
				isLoading={isSubmitting}
			/>
		</>
	);
}
