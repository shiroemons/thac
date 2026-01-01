import { createId } from "@thac/db";
import { useEffect, useState } from "react";
import { useConflictHandler } from "@/hooks/use-conflict-handler";
import {
	type EventSeries,
	eventSeriesApi,
	isConflictError,
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
import { ConflictDialog } from "./conflict-dialog";

export interface EventSeriesFormData {
	name: string;
	sortOrder: number;
}

export interface EventSeriesEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	eventSeries?: EventSeries | null;
	onSuccess?: () => void;
	/** 新規作成時のデフォルトsortOrder（未指定時は0） */
	defaultSortOrder?: number;
}

export function EventSeriesEditDialog({
	open,
	onOpenChange,
	mode,
	eventSeries,
	onSuccess,
	defaultSortOrder = 0,
}: EventSeriesEditDialogProps) {
	const [form, setForm] = useState<EventSeriesFormData>({
		name: "",
		sortOrder: 0,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 楽観的ロック用: 編集開始時のupdatedAtを記録
	const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
		null,
	);
	const { conflictState, setConflict, clearConflict } =
		useConflictHandler<EventSeries>();

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && eventSeries) {
				setForm({
					name: eventSeries.name,
					sortOrder: eventSeries.sortOrder ?? 0,
				});
				setOriginalUpdatedAt(eventSeries.updatedAt);
			} else {
				setForm({
					name: "",
					sortOrder: defaultSortOrder,
				});
				setOriginalUpdatedAt(null);
			}
			setError(null);
			clearConflict();
		}
	}, [open, mode, eventSeries, defaultSortOrder, clearConflict]);

	const handleSubmit = async (overrideUpdatedAt?: string) => {
		if (!form.name.trim()) {
			setError("名前を入力してください");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (mode === "create") {
				const id = createId.eventSeries();
				await eventSeriesApi.create({
					id,
					name: form.name,
					sortOrder: form.sortOrder,
				});
			} else if (eventSeries) {
				await eventSeriesApi.update(eventSeries.id, {
					name: form.name,
					sortOrder: form.sortOrder,
					// 楽観的ロック: updatedAtを送信
					updatedAt: overrideUpdatedAt || originalUpdatedAt || undefined,
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
			// 楽観的ロック競合エラーの場合
			if (isConflictError<EventSeries>(e)) {
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
	const handleContinueEditing = (data: EventSeries) => {
		setForm({
			name: data.name,
			sortOrder: data.sortOrder ?? 0,
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

	const title =
		mode === "create" ? "新規イベントシリーズ" : "イベントシリーズの編集";

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[425px]">
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
							<Label htmlFor="eventSeries-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="eventSeries-name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="例: 博麗神社例大祭"
								disabled={isSubmitting}
							/>
						</div>
						{mode === "edit" && (
							<div className="grid gap-2">
								<Label htmlFor="eventSeries-sortOrder">表示順</Label>
								<Input
									id="eventSeries-sortOrder"
									type="number"
									value={form.sortOrder}
									onChange={(e) =>
										setForm({
											...form,
											sortOrder: e.target.value
												? Number.parseInt(e.target.value, 10)
												: 0,
										})
									}
									disabled={isSubmitting}
								/>
							</div>
						)}
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
							disabled={isSubmitting || !form.name.trim()}
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
