import { createId } from "@thac/db";
import { useEffect, useState } from "react";
import { type EventSeries, eventSeriesApi } from "@/lib/api-client";
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

	// ダイアログが開いた時にフォームを初期化
	useEffect(() => {
		if (open) {
			if (mode === "edit" && eventSeries) {
				setForm({
					name: eventSeries.name,
					sortOrder: eventSeries.sortOrder ?? 0,
				});
			} else {
				setForm({
					name: "",
					sortOrder: defaultSortOrder,
				});
			}
			setError(null);
		}
	}, [open, mode, eventSeries, defaultSortOrder]);

	const handleSubmit = async () => {
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
				});
			}
			onOpenChange(false);
			onSuccess?.();
		} catch (e) {
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

	const title =
		mode === "create" ? "新規イベントシリーズ" : "イベントシリーズの編集";

	return (
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
						onClick={handleSubmit}
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
	);
}
