import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createId } from "@thac/db";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
	type Event,
	type EventWithDays,
	eventSeriesApi,
	isConflictError,
} from "@/lib/api-client";
import { suggestFromEventName } from "@/lib/event-name-parser";
import { eventMutations, eventSeriesMutations } from "@/lib/mutation-options";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SearchableSelect } from "../ui/searchable-select";
import { ConflictDialog } from "./conflict-dialog";

export interface EventFormData {
	name: string;
	eventSeriesId: string | null;
	edition: number | null;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
}

export interface EventEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	event?: Event | EventWithDays | null;
	onSuccess?: () => void;
}

export function EventEditDialog({
	open,
	onOpenChange,
	mode,
	event,
	onSuccess,
}: EventEditDialogProps) {
	const queryClient = useQueryClient();

	const [form, setForm] = useState<EventFormData>({
		name: "",
		eventSeriesId: null,
		edition: null,
		venue: null,
		startDate: null,
		endDate: null,
	});
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<Event>();

	// フォーム変更検出フック
	const formDirty = useFormDirty<EventFormData & Record<string, unknown>>();

	// 未保存変更保護フック
	const {
		showConfirmDialog,
		closeConfirmDialog,
		confirmDiscard,
		guardedOnOpenChange,
	} = useUnsavedChangesGuard(onOpenChange, {
		isDirty: formDirty.isDirty,
		isOpen: open,
	});

	// シリーズ新規作成用
	const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState("");

	// useMutation hooks
	const createMutation = useMutation(eventMutations.create(queryClient));
	const updateMutation = useMutation(eventMutations.update(queryClient));
	const seriesCreateMutation = useMutation(
		eventSeriesMutations.create(queryClient),
	);

	// ローディング状態とエラー状態
	const isPending =
		createMutation.isPending ||
		updateMutation.isPending ||
		seriesCreateMutation.isPending;
	const mutationError =
		createMutation.error || updateMutation.error || seriesCreateMutation.error;

	// シリーズ一覧取得
	const { data: seriesData } = useQuery({
		queryKey: ["event-series"],
		queryFn: () => eventSeriesApi.list(),
		staleTime: 60_000,
	});
	const seriesList = seriesData?.data ?? [];

	const seriesOptions = useMemo(
		() => seriesList.map((s) => ({ value: s.id, label: s.name })),
		[seriesList],
	);

	// シリーズリストをユーティリティ関数で使えるようにラップ
	const suggest = useCallback(
		(eventName: string) => suggestFromEventName(eventName, seriesList),
		[seriesList],
	);

	// ダイアログが開いた時にフォームを初期化
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation.resetは毎回新しい参照を返す可能性があるため、意図的に依存配列から除外
	useEffect(() => {
		if (open) {
			let initialFormState: EventFormData;
			if (mode === "edit" && event) {
				initialFormState = {
					name: event.name,
					eventSeriesId: event.eventSeriesId,
					edition: event.edition,
					venue: event.venue,
					startDate: event.startDate,
					endDate: event.endDate,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(event.updatedAt);
			} else {
				initialFormState = {
					name: "",
					eventSeriesId: null,
					edition: null,
					venue: null,
					startDate: null,
					endDate: null,
				};
				setForm(initialFormState);
				setOriginalUpdatedAt(null);
			}
			// フォームの初期状態を記録
			formDirty.setInitialState(
				initialFormState as EventFormData & Record<string, unknown>,
			);
			// ダイアログを開いた時にmutationのエラー状態をリセット
			createMutation.reset();
			updateMutation.reset();
			seriesCreateMutation.reset();
			clearConflict();
		}
	}, [open, mode, event, clearConflict]);

	// フォーム変更を検出
	// biome-ignore lint/correctness/useExhaustiveDependencies: formDirty.checkDirtyは安定した参照を持つため、意図的に依存配列から除外
	useEffect(() => {
		formDirty.checkDirty(form as EventFormData & Record<string, unknown>);
	}, [form]);

	const handleNameChange = (name: string) => {
		const suggestion = suggest(name);
		if (mode === "create" && suggestion) {
			setForm({
				...form,
				name,
				eventSeriesId: suggestion.seriesId || form.eventSeriesId,
				edition: suggestion.edition || form.edition,
			});
		} else {
			setForm({ ...form, name });
		}
	};

	const handleCreateSeries = () => {
		if (!newSeriesName.trim()) return;
		const id = createId.eventSeries();
		seriesCreateMutation.mutate(
			{
				id,
				name: newSeriesName.trim(),
				sortOrder: seriesList.length + 1,
			},
			{
				onSuccess: (newSeries) => {
					setForm({ ...form, eventSeriesId: newSeries.id });
					setIsSeriesDialogOpen(false);
					setNewSeriesName("");
				},
			},
		);
	};

	const handleSubmit = (overrideUpdatedAt?: string) => {
		if (!form.name.trim()) {
			return;
		}

		if (mode === "create") {
			const id = createId.event();
			createMutation.mutate(
				{
					id,
					eventSeriesId: form.eventSeriesId || "",
					name: form.name,
					edition: form.edition,
					totalDays: null,
					venue: form.venue,
					startDate: form.startDate,
					endDate: form.endDate,
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
				},
			);
		} else if (event) {
			updateMutation.mutate(
				{
					id: event.id,
					data: {
						eventSeriesId: form.eventSeriesId,
						name: form.name,
						edition: form.edition,
						venue: form.venue,
						startDate: form.startDate,
						endDate: form.endDate,
						// 楽観的ロック: updatedAtを送信
						updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
					},
				},
				{
					onSuccess: () => {
						formDirty.reset();
						onOpenChange(false);
						onSuccess?.();
					},
					onError: (e) => {
						// 楽観的ロック競合エラーの場合
						if (isConflictError<Event>(e)) {
							setConflict(e.current);
						}
					},
				},
			);
		}
	};

	// 競合ダイアログで「編集を続ける」を選択した場合
	const handleContinueEditing = (data: Event) => {
		setForm({
			name: data.name,
			eventSeriesId: data.eventSeriesId,
			edition: data.edition,
			venue: data.venue,
			startDate: data.startDate,
			endDate: data.endDate,
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

	// エラーメッセージの取得（競合エラー以外）
	const displayError =
		mutationError && !isConflictError(mutationError)
			? mutationError instanceof Error
				? mutationError.message
				: mode === "create"
					? "作成に失敗しました"
					: "更新に失敗しました"
			: null;

	const title = mode === "create" ? "新規イベント" : "イベントの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={guardedOnOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{displayError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{displayError}
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-event-name`}>
								イベント名 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-event-name`}
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="例: 博麗神社例大祭21"
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor={`${mode}-event-series`}>シリーズ</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-primary text-xs hover:underline"
									onClick={() => setIsSeriesDialogOpen(true)}
									disabled={isPending}
								>
									+ 新規シリーズ作成
								</Button>
							</div>
							<SearchableSelect
								id={`${mode}-event-series`}
								value={form.eventSeriesId || ""}
								onChange={(val) =>
									setForm({ ...form, eventSeriesId: val || null })
								}
								options={seriesOptions}
								placeholder="シリーズを選択..."
								searchPlaceholder="シリーズを検索..."
								emptyMessage="シリーズが見つかりません"
								disabled={isPending}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-event-edition`}>回次</Label>
								<Input
									id={`${mode}-event-edition`}
									type="number"
									value={form.edition ?? ""}
									onChange={(e) =>
										setForm({
											...form,
											edition: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 21"
									disabled={isPending}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-event-venue`}>会場</Label>
								<Input
									id={`${mode}-event-venue`}
									value={form.venue || ""}
									onChange={(e) =>
										setForm({ ...form, venue: e.target.value || null })
									}
									placeholder="例: 東京ビッグサイト"
									disabled={isPending}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-event-startDate`}>開始日</Label>
								<Input
									id={`${mode}-event-startDate`}
									type="date"
									value={form.startDate || ""}
									onChange={(e) =>
										setForm({ ...form, startDate: e.target.value || null })
									}
									disabled={isPending}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor={`${mode}-event-endDate`}>終了日</Label>
								<Input
									id={`${mode}-event-endDate`}
									type="date"
									value={form.endDate || ""}
									onChange={(e) =>
										setForm({ ...form, endDate: e.target.value || null })
									}
									disabled={isPending}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => guardedOnOpenChange(false)}
							disabled={isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => handleSubmit()}
							disabled={isPending || !form.name.trim()}
						>
							{isPending
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

			{/* シリーズ新規作成ダイアログ */}
			<Dialog open={isSeriesDialogOpen} onOpenChange={setIsSeriesDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ作成</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor={`${mode}-new-series-name`}>
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id={`${mode}-new-series-name`}
								value={newSeriesName}
								onChange={(e) => setNewSeriesName(e.target.value)}
								placeholder="例: 博麗神社例大祭"
								disabled={isPending}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsSeriesDialogOpen(false)}
							disabled={isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreateSeries}
							disabled={isPending || !newSeriesName.trim()}
						>
							{isPending ? "作成中..." : "作成"}
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
				isLoading={isPending}
			/>

			{/* 未保存変更確認ダイアログ */}
			<ConfirmDialog
				open={showConfirmDialog}
				onOpenChange={(open) => !open && closeConfirmDialog()}
				title="変更を破棄しますか？"
				description="保存されていない変更があります。このまま閉じると変更は失われます。"
				confirmLabel="破棄"
				cancelLabel="編集を続ける"
				variant="warning"
				onConfirm={confirmDiscard}
			/>
		</>
	);
}
