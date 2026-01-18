import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { formatNumber } from "../../lib/format";

/**
 * 統計情報の1項目を表すオブジェクト
 */
export interface StatItem {
	/** 統計ラベル（例: "トラック"、"作品"） */
	label: string;
	/** 統計値（数値または文字列） */
	value: string | number;
	/** アイコン（Lucide React等のReactNode、省略可） */
	icon?: ReactNode;
	/** リンク先（省略可） */
	href?: string;
	/** アイコンの色クラス（例: "text-primary"、"text-secondary"） */
	iconColorClass?: string;
}

export interface StatsCardGridProps {
	/** 統計項目の配列 */
	items: StatItem[];
	/** グリッドの列数（デフォルト: 2） */
	columns?: 2 | 3 | 4;
	/** カードのスタイルバリアント */
	variant?: "default" | "glass";
}

/**
 * 統計カードを一貫したグリッドレイアウトで表示するコンポーネント
 *
 * @example
 * ```tsx
 * <StatsCardGrid
 *   items={[
 *     { label: "トラック", value: 1234, icon: <Music className="size-5" />, iconColorClass: "text-primary" },
 *     { label: "作品", value: 567, icon: <Disc3 className="size-5" />, iconColorClass: "text-secondary" },
 *   ]}
 * />
 * ```
 */
export function StatsCardGrid({
	items,
	columns = 2,
	variant = "default",
}: StatsCardGridProps) {
	const gridColsClass =
		columns === 2
			? "grid-cols-2"
			: columns === 3
				? "grid-cols-2 sm:grid-cols-3"
				: "grid-cols-2 sm:grid-cols-4";

	const cardBaseClass =
		variant === "glass"
			? "glass-card-light rounded-2xl p-4 text-center transition-all duration-300 hover:shadow-md"
			: "rounded-2xl bg-base-200/50 p-4 text-center transition-all duration-300 hover:bg-base-200/70 hover:ring-2 hover:ring-primary/10";

	return (
		<div className={`grid gap-4 ${gridColsClass}`}>
			{items.map((item) => (
				<StatCard key={item.label} item={item} cardClassName={cardBaseClass} />
			))}
		</div>
	);
}

interface StatCardInternalProps {
	item: StatItem;
	cardClassName: string;
}

function StatCard({ item, cardClassName }: StatCardInternalProps) {
	const { label, value, icon, href, iconColorClass = "text-primary" } = item;

	const formattedValue =
		typeof value === "number" ? formatNumber(value) : value;

	const content = (
		<div className={cardClassName}>
			<div
				className={`flex items-center justify-center gap-2 ${iconColorClass}`}
			>
				{icon}
				<span className="font-bold text-2xl">{formattedValue}</span>
			</div>
			<p className="mt-1 text-base-content/70 text-sm">{label}</p>
		</div>
	);

	if (href) {
		return (
			<Link to={href} preload="intent" className="block">
				{content}
			</Link>
		);
	}

	return content;
}
