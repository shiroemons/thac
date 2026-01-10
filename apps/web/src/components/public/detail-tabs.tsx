import { BarChart3, Disc3, Music } from "lucide-react";
import type { ReactNode } from "react";

// =============================================================================
// 型定義
// =============================================================================

interface TabConfig<T extends string> {
	key: T;
	label: string;
	icon?: ReactNode;
}

interface DetailTabsProps<T extends string> {
	tabs: TabConfig<T>[];
	activeTab: T;
	onTabChange: (tab: T) => void;
}

// =============================================================================
// コンポーネント
// =============================================================================

/**
 * 詳細ページ用タブコンポーネント
 */
export function DetailTabs<T extends string>({
	tabs,
	activeTab,
	onTabChange,
}: DetailTabsProps<T>) {
	return (
		<div role="tablist" className="tabs tabs-boxed w-fit">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					type="button"
					role="tab"
					className={`tab gap-2 ${activeTab === tab.key ? "tab-active" : ""}`}
					onClick={() => onTabChange(tab.key)}
					aria-selected={activeTab === tab.key}
				>
					{tab.icon}
					{tab.label}
				</button>
			))}
		</div>
	);
}

// =============================================================================
// タブアイコン
// =============================================================================

export const TabIcons = {
	releases: <Disc3 className="size-4" />,
	tracks: <Music className="size-4" />,
	stats: <BarChart3 className="size-4" />,
} as const;
