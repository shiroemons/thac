import { BarChart3 } from "lucide-react";

// =============================================================================
// 型定義
// =============================================================================

interface StatsPlaceholderProps {
	entityType: "circle" | "artist" | "event";
	entityName: string;
}

// =============================================================================
// 定数
// =============================================================================

const ENTITY_LABELS = {
	circle: "サークル",
	artist: "アーティスト",
	event: "イベント",
} as const;

// =============================================================================
// コンポーネント
// =============================================================================

/**
 * 統計タブのプレースホルダーコンポーネント
 */
export function StatsPlaceholder({
	entityType,
	entityName,
}: StatsPlaceholderProps) {
	return (
		<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
			<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-base-200">
				<BarChart3 className="size-8 text-base-content/50" />
			</div>
			<h3 className="mb-2 font-bold text-lg">{entityName}の統計情報</h3>
			<p className="text-base-content/70">
				{ENTITY_LABELS[entityType]}の詳細な統計情報がここに表示されます
			</p>
			<p className="mt-4 text-base-content/50 text-sm">
				この機能は今後実装予定です
			</p>
		</div>
	);
}
