import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, Search, SearchX } from "lucide-react";

export type EmptyStateType = "filter" | "empty" | "error" | "search";

interface EmptyStateProps {
	type?: EmptyStateType;
	title?: string;
	description?: string;
	icon?: LucideIcon;
	action?: React.ReactNode;
}

const defaultConfigs: Record<
	EmptyStateType,
	{ icon: LucideIcon; title: string; description: string }
> = {
	filter: {
		icon: SearchX,
		title: "該当するデータがありません",
		description: "フィルター条件を変更してお試しください",
	},
	empty: {
		icon: Inbox,
		title: "データがありません",
		description: "まだ登録されていません",
	},
	error: {
		icon: AlertCircle,
		title: "エラーが発生しました",
		description: "データの読み込みに失敗しました",
	},
	search: {
		icon: Search,
		title: "検索結果がありません",
		description: "別のキーワードでお試しください",
	},
};

export function EmptyState({
	type = "filter",
	title,
	description,
	icon: CustomIcon,
	action,
}: EmptyStateProps) {
	const config = defaultConfigs[type];
	const Icon = CustomIcon ?? config.icon;
	const displayTitle = title ?? config.title;
	const displayDescription = description ?? config.description;

	return (
		<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
			<Icon className="mx-auto size-12 text-base-content/30" />
			<h3 className="mt-4 font-medium text-base-content/70 text-lg">
				{displayTitle}
			</h3>
			<p className="mt-2 text-base-content/50 text-sm">{displayDescription}</p>
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
