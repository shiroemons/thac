import { useEffect, useState } from "react";
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
import { type Track, tracksApi } from "@/lib/api-client";

interface TrackEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track: Track;
	onSuccess?: () => void;
}

export function TrackEditDialog({
	open,
	onOpenChange,
	track,
	onSuccess,
}: TrackEditDialogProps) {
	const [editForm, setEditForm] = useState<Partial<Track>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ダイアログが開いたらフォームを初期化
	useEffect(() => {
		if (open && track) {
			setEditForm({
				name: track.name,
				nameJa: track.nameJa,
				nameEn: track.nameEn,
				trackNumber: track.trackNumber,
			});
			setMutationError(null);
		}
	}, [open, track]);

	// 保存
	const handleSave = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await tracksApi.update(track.releaseId, track.id, {
				name: editForm.name ?? "",
				nameJa: editForm.nameJa || null,
				nameEn: editForm.nameEn || null,
				trackNumber: editForm.trackNumber,
			});
			onSuccess?.();
			onOpenChange(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>トラックの編集</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{mutationError && (
						<div className="rounded-md bg-error/10 p-3 text-error text-sm">
							{mutationError}
						</div>
					)}
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
							placeholder="例: ネイティブフェイス"
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
					<div className="grid gap-2">
						<Label htmlFor="nameJa">日本語名</Label>
						<Input
							id="nameJa"
							value={editForm.nameJa || ""}
							onChange={(e) =>
								setEditForm({ ...editForm, nameJa: e.target.value })
							}
							placeholder="例: ネイティブフェイス"
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
							placeholder="例: Native Face"
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
						onClick={handleSave}
						disabled={isSubmitting || !editForm.name}
					>
						{isSubmitting ? "保存中..." : "保存"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
