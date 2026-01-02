import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import {
	type OfficialSongLink,
	type OfficialWorkLink,
	platformsApi,
} from "@/lib/api-client";
import {
	PLATFORM_CATEGORY_LABELS,
	PLATFORM_CATEGORY_ORDER,
} from "@/lib/constants";

export interface OfficialLinkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	entityType: "work" | "song";
	link?: OfficialWorkLink | OfficialSongLink;
	onSubmit: (data: { platformCode: string; url: string }) => Promise<void>;
}

export function OfficialLinkDialog({
	open,
	onOpenChange,
	mode,
	entityType,
	link,
	onSubmit,
}: OfficialLinkDialogProps) {
	const [platformCode, setPlatformCode] = useState(link?.platformCode ?? "");
	const [url, setUrl] = useState(link?.url ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ダイアログが開いた時にlinkプロップの値でフォーム状態を同期
	useEffect(() => {
		if (open) {
			setPlatformCode(link?.platformCode ?? "");
			setUrl(link?.url ?? "");
			setError(null);
		}
	}, [open, link]);

	// プラットフォーム一覧取得
	const { data: platformsData } = useQuery({
		queryKey: ["platforms"],
		queryFn: () => platformsApi.list({ limit: 100 }),
		staleTime: 300_000,
	});

	// プラットフォームのグループ化オプション（日本語ラベル・順序付き）
	const platformOptions = useMemo(() => {
		const platforms = platformsData?.data ?? [];
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

	// ダイアログが開かれたときにフォームをリセット
	const handleOpenChange = (newOpen: boolean) => {
		if (newOpen) {
			setPlatformCode(link?.platformCode ?? "");
			setUrl(link?.url ?? "");
			setError(null);
		}
		onOpenChange(newOpen);
	};

	const handleSubmit = async () => {
		setError(null);

		// バリデーション
		if (!platformCode) {
			setError("プラットフォームを選択してください");
			return;
		}
		if (!url) {
			setError("URLを入力してください");
			return;
		}

		// URL形式チェック
		try {
			new URL(url);
		} catch {
			setError("有効なURLを入力してください");
			return;
		}

		setIsSubmitting(true);
		try {
			await onSubmit({ platformCode, url });
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "エラーが発生しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const entityLabel = entityType === "work" ? "作品" : "楽曲";
	const title =
		mode === "create" ? `${entityLabel}の外部リンクを追加` : "外部リンクの編集";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
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
						<Label htmlFor="link-platform">
							プラットフォーム <span className="text-error">*</span>
						</Label>
						<GroupedSearchableSelect
							id="link-platform"
							value={platformCode}
							onChange={(val) => setPlatformCode(val)}
							options={platformOptions}
							groupOrder={platformGroupOrder}
							placeholder="プラットフォームを選択"
							searchPlaceholder="プラットフォームを検索..."
							emptyMessage="プラットフォームが見つかりません"
							ungroupedLabel="その他"
							disabled={isSubmitting}
						/>
					</div>

					<div className="grid gap-2">
						<Label>
							URL <span className="text-error">*</span>
						</Label>
						<Input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://..."
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
						onClick={handleSubmit}
						disabled={isSubmitting || !platformCode || !url}
					>
						{isSubmitting
							? mode === "edit"
								? "更新中..."
								: "追加中..."
							: mode === "edit"
								? "更新"
								: "追加"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
