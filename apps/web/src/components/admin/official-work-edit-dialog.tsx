import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	isConflictError,
	type OfficialWork,
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
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ConflictDialog } from "./conflict-dialog";

// カテゴリコード（ID生成用）
const CATEGORY_CODES: Record<string, string> = {
	pc98: "01",
	windows: "02",
	zuns_music_collection: "03",
	akyus_untouched_score: "04",
	commercial_books: "05",
	tasofro: "06",
	other: "07",
};

export interface OfficialWorkFormData {
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	numberInSeries: number | null;
	releaseDate: string | null;
	officialOrganization: string | null;
	position: number | null;
	notes: string | null;
}

export interface OfficialWorkEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	work?: OfficialWork | null;
	onSuccess?: () => void;
}

export function OfficialWorkEditDialog({
	open,
	onOpenChange,
	mode,
	work,
	onSuccess,
}: OfficialWorkEditDialogProps) {
	const [form, setForm] = useState<OfficialWorkFormData>({
		id: "",
		categoryCode: "",
		name: "",
		nameJa: "",
		nameEn: null,
		shortNameJa: null,
		shortNameEn: null,
		numberInSeries: null,
		releaseDate: null,
		officialOrganization: null,
		position: null,
		notes: null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<OfficialWork>();

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});

	const categoryOptions = useMemo(
		() =>
			categoriesData?.data.map((c) => ({
				value: c.code,
				label: c.name,
			})) ?? [],
		[categoriesData?.data],
	);

	// 全作品を取得（ID生成用）
	const { data: allWorksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
		enabled: mode === "create",
	});

	// 次のIDを生成
	const generateNextId = (categoryKey: string): string => {
		const categoryCode = CATEGORY_CODES[categoryKey];
		if (!categoryCode) return "";

		const allWorks = allWorksData?.data ?? [];
		const categoryWorks = allWorks.filter((w) => w.id.startsWith(categoryCode));

		if (categoryWorks.length === 0) {
			return `${categoryCode}01`;
		}

		const maxNumber = Math.max(
			...categoryWorks.map((w) => {
				const num = Number.parseInt(w.id.slice(2), 10);
				return Number.isNaN(num) ? 0 : num;
			}),
		);

		const nextNumber = (maxNumber + 1).toString().padStart(2, "0");
		return `${categoryCode}${nextNumber}`;
	};

	// 次のpositionを計算
	const calculateNextPosition = (): number => {
		const allWorks = allWorksData?.data ?? [];
		if (allWorks.length === 0) return 1;

		const maxPosition = Math.max(...allWorks.map((w) => w.position ?? 0));
		return maxPosition + 1;
	};

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && work) {
				setForm({
					id: work.id,
					categoryCode: work.categoryCode,
					name: work.name,
					nameJa: work.nameJa,
					nameEn: work.nameEn,
					shortNameJa: work.shortNameJa,
					shortNameEn: work.shortNameEn,
					numberInSeries: work.numberInSeries,
					releaseDate: work.releaseDate,
					officialOrganization: work.officialOrganization,
					position: work.position,
					notes: work.notes,
				});
				setOriginalUpdatedAt(work.updatedAt);
			} else {
				setForm({
					id: "",
					categoryCode: "",
					name: "",
					nameJa: "",
					nameEn: null,
					shortNameJa: null,
					shortNameEn: null,
					numberInSeries: null,
					releaseDate: null,
					officialOrganization: null,
					position: null,
					notes: null,
				});
				setOriginalUpdatedAt(null);
			}
			setError(null);
			clearConflict();
		}
	}, [open, mode, work, clearConflict]);

	const handleCategoryChange = (categoryCode: string) => {
		if (mode === "create") {
			const nextId = generateNextId(categoryCode);
			const nextPosition = calculateNextPosition();
			setForm({
				...form,
				categoryCode,
				id: nextId,
				position: nextPosition,
			});
		} else {
			setForm({ ...form, categoryCode });
		}
	};

	const handleSubmit = async (overrideUpdatedAt?: string) => {
		if (!form.categoryCode || !form.name || !form.nameJa) {
			setError("必須項目を入力してください");
			return;
		}

		if (mode === "create" && !form.id) {
			setError("カテゴリを選択してIDを生成してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				await officialWorksApi.create({
					id: form.id,
					categoryCode: form.categoryCode,
					name: form.name,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					shortNameJa: form.shortNameJa,
					shortNameEn: form.shortNameEn,
					numberInSeries: form.numberInSeries,
					releaseDate: form.releaseDate,
					officialOrganization: form.officialOrganization,
					position: form.position,
					notes: form.notes,
				});
			} else if (work) {
				await officialWorksApi.update(work.id, {
					categoryCode: form.categoryCode,
					name: form.name,
					nameJa: form.nameJa,
					nameEn: form.nameEn,
					shortNameJa: form.shortNameJa,
					shortNameEn: form.shortNameEn,
					numberInSeries: form.numberInSeries,
					releaseDate: form.releaseDate,
					officialOrganization: form.officialOrganization,
					notes: form.notes,
					// position は編集時には更新しない
					// 楽観的ロック: updatedAtを送信
					updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<OfficialWork>(e)) {
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
	const handleContinueEditing = (data: OfficialWork) => {
		setForm({
			id: data.id,
			categoryCode: data.categoryCode,
			name: data.name,
			nameJa: data.nameJa,
			nameEn: data.nameEn,
			shortNameJa: data.shortNameJa,
			shortNameEn: data.shortNameEn,
			numberInSeries: data.numberInSeries,
			releaseDate: data.releaseDate,
			officialOrganization: data.officialOrganization,
			position: data.position,
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

	const title = mode === "create" ? "新規公式作品" : "公式作品の編集";

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
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-categoryCode`}>
									カテゴリ <span className="text-error">*</span>
								</Label>
								<Select
									id={`${mode}-work-categoryCode`}
									value={form.categoryCode}
									onChange={(e) => handleCategoryChange(e.target.value)}
									disabled={isSubmitting || mode === "edit"}
								>
									<option value="">選択してください</option>
									{categoryOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-id`}>
									ID {mode === "create" && "(自動生成)"}
								</Label>
								<Input
									id={`${mode}-work-id`}
									value={form.id}
									disabled
									className="font-mono"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-work-name`}>
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-work-name`}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: Touhou Koumakyou"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-nameJa`}>
									日本語名 <span className="text-error">*</span>
								</Label>
								<Input
									id={`${mode}-work-nameJa`}
									value={form.nameJa}
									onChange={(e) => setForm({ ...form, nameJa: e.target.value })}
									placeholder="例: 東方紅魔郷"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-nameEn`}>英語名</Label>
								<Input
									id={`${mode}-work-nameEn`}
									value={form.nameEn || ""}
									onChange={(e) =>
										setForm({ ...form, nameEn: e.target.value || null })
									}
									placeholder="例: Embodiment of Scarlet Devil"
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-shortNameJa`}>
									短縮名（日本語）
								</Label>
								<Input
									id={`${mode}-work-shortNameJa`}
									value={form.shortNameJa || ""}
									onChange={(e) =>
										setForm({ ...form, shortNameJa: e.target.value || null })
									}
									placeholder="例: 紅"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-shortNameEn`}>
									短縮名（英語）
								</Label>
								<Input
									id={`${mode}-work-shortNameEn`}
									value={form.shortNameEn || ""}
									onChange={(e) =>
										setForm({ ...form, shortNameEn: e.target.value || null })
									}
									placeholder="例: EoSD"
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-numberInSeries`}>
									シリーズ番号
								</Label>
								<Input
									id={`${mode}-work-numberInSeries`}
									type="number"
									value={form.numberInSeries ?? ""}
									onChange={(e) =>
										setForm({
											...form,
											numberInSeries: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 6"
									disabled={isSubmitting}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-work-releaseDate`}>発売日</Label>
								<Input
									id={`${mode}-work-releaseDate`}
									type="date"
									value={form.releaseDate || ""}
									onChange={(e) =>
										setForm({ ...form, releaseDate: e.target.value || null })
									}
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-work-officialOrganization`}>
								発行元
							</Label>
							<Input
								id={`${mode}-work-officialOrganization`}
								value={form.officialOrganization || ""}
								onChange={(e) =>
									setForm({
										...form,
										officialOrganization: e.target.value || null,
									})
								}
								placeholder="例: 上海アリス幻樂団"
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-work-notes`}>備考</Label>
							<Textarea
								id={`${mode}-work-notes`}
								value={form.notes || ""}
								onChange={(e) =>
									setForm({ ...form, notes: e.target.value || null })
								}
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
							disabled={
								isSubmitting || !form.categoryCode || !form.name || !form.nameJa
							}
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
				getDisplayName={(data) => data.name}
				onOverwrite={handleOverwrite}
				onContinueEditing={handleContinueEditing}
				isLoading={isSubmitting}
			/>
		</>
	);
}
