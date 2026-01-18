import {
	ChevronRight,
	Disc3,
	Home,
	type LucideIcon,
	MoreHorizontal,
	Music,
	UserRound,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** エンティティタイプ */
export type EntityType =
	| "artist"
	| "circle"
	| "release"
	| "track"
	| "event"
	| "original-song"
	| "official-work";

/** エンティティタイプ別アイコンマッピング */
const ENTITY_ICONS: Record<EntityType, LucideIcon> = {
	artist: UserRound,
	circle: Users,
	release: Disc3,
	track: Music,
	event: Disc3, // イベントはDisc3を流用
	"original-song": Music,
	"official-work": Disc3,
};

/** ラベルからエンティティタイプを推定 */
function inferEntityType(label: string): EntityType | null {
	const labelToType: Record<string, EntityType> = {
		アーティスト: "artist",
		サークル: "circle",
		作品: "release",
		トラック: "track",
		イベント: "event",
		原曲: "original-song",
		原作: "official-work",
	};
	return labelToType[label] ?? null;
}

export interface BreadcrumbItemData {
	label: string;
	href?: string;
	/** 明示的にアイコンを指定（指定がなければlabelから推定） */
	icon?: ReactNode;
	/** エンティティタイプ（アイコン自動選択用） */
	entityType?: EntityType;
}

interface PublicBreadcrumbProps {
	items: BreadcrumbItemData[];
	/** モバイルでの省略表示を有効化（デフォルト: true） */
	collapsible?: boolean;
	/** 省略時に表示する最大項目数（デフォルト: 3） */
	maxVisibleItems?: number;
}

/** パンくず項目のアイコンを取得 */
function getItemIcon(item: BreadcrumbItemData, isHome: boolean): ReactNode {
	// 明示的なアイコン指定
	if (item.icon) return item.icon;

	// ホームアイコン
	if (isHome) return <Home className="size-4" />;

	// エンティティタイプから推定
	const entityType = item.entityType ?? inferEntityType(item.label);
	if (entityType) {
		const Icon = ENTITY_ICONS[entityType];
		return <Icon className="size-4" />;
	}

	return null;
}

export function PublicBreadcrumb({
	items,
	collapsible = true,
	maxVisibleItems = 3,
}: PublicBreadcrumbProps) {
	// ホームを先頭に追加
	const allItems: BreadcrumbItemData[] = [
		{ label: "ホーム", href: "/" },
		...items,
	];

	// モバイル省略表示の計算
	const shouldCollapse = collapsible && allItems.length > maxVisibleItems;
	const visibleItems = shouldCollapse
		? [
				allItems[0], // 最初（ホーム）
				{ label: "...", href: undefined } as BreadcrumbItemData, // 省略マーカー
				...allItems.slice(-2), // 最後2つ
			]
		: allItems;

	return (
		<Breadcrumb className="mb-4">
			<BreadcrumbList>
				{visibleItems.map((item, index) => {
					const isLast = index === visibleItems.length - 1;
					const isHome = index === 0;
					const isEllipsis = item.label === "...";

					const icon = isEllipsis ? null : getItemIcon(item, isHome);

					return (
						<BreadcrumbItem
							key={`${item.label}-${index}`}
							className={
								shouldCollapse && !isHome && !isLast ? "hidden sm:flex" : ""
							}
						>
							{index > 0 && (
								<BreadcrumbSeparator
									className={
										shouldCollapse && !isHome && !isLast ? "hidden sm:flex" : ""
									}
								>
									<ChevronRight className="size-4 text-base-content/50" />
								</BreadcrumbSeparator>
							)}
							{isEllipsis ? (
								<span className="flex items-center px-1 text-base-content/50 sm:hidden">
									<MoreHorizontal className="size-4" />
								</span>
							) : isLast || !item.href ? (
								<BreadcrumbPage className="flex items-center gap-1.5 font-medium text-base-content">
									{icon}
									<span className="line-clamp-1">{item.label}</span>
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									to={item.href}
									className="flex items-center gap-1.5 text-base-content/70 transition-colors duration-300 hover:text-primary"
								>
									{icon}
									<span className="line-clamp-1">{item.label}</span>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
