import {
	BarChart3,
	Calendar,
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
	| "official-work"
	| "stats";

/** エンティティタイプ別アイコンマッピング */
const ENTITY_ICONS: Record<EntityType, LucideIcon> = {
	artist: UserRound,
	circle: Users,
	release: Disc3,
	track: Music,
	event: Calendar,
	"original-song": Music,
	"official-work": Disc3,
	stats: BarChart3,
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
		統計: "stats",
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

	// モバイル省略表示の判定
	const shouldCollapse = collapsible && allItems.length > maxVisibleItems;

	return (
		<Breadcrumb className="mb-4">
			<BreadcrumbList>
				{allItems.map((item, index) => {
					const isHome = index === 0;
					const isLast = index === allItems.length - 1;
					// 最後の2項目かどうか（モバイルでも表示する）
					const isLastTwo = index >= allItems.length - 2;

					// 中間項目かどうか（モバイルで非表示にする対象）
					// ホームと最後の2項目以外が中間項目
					const isMiddleItem = shouldCollapse && !isHome && !isLastTwo;

					const icon = getItemIcon(item, isHome);

					// モバイルでの表示順序を制御
					// ホーム: order-1, 最後の2項目: order-3, 中間項目: hidden
					const orderClass = shouldCollapse
						? isHome
							? "order-1 sm:order-none"
							: isLastTwo
								? "order-3 sm:order-none"
								: ""
						: "";

					return (
						<BreadcrumbItem
							key={`${item.label}-${index}`}
							className={`${isMiddleItem ? "hidden sm:flex" : ""} ${orderClass}`.trim()}
						>
							{/* セパレータ */}
							{index > 0 && (
								<BreadcrumbSeparator
									className={isMiddleItem ? "hidden sm:flex" : ""}
								>
									<ChevronRight className="size-4 text-base-content/50" />
								</BreadcrumbSeparator>
							)}

							{/* アイテム本体 */}
							{isLast || !item.href ? (
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

				{/* モバイル用省略マーカー（ホームと最後の2項目の間に表示） */}
				{shouldCollapse && (
					<BreadcrumbItem className="order-2 sm:hidden">
						<BreadcrumbSeparator>
							<ChevronRight className="size-4 text-base-content/50" />
						</BreadcrumbSeparator>
						<span className="flex items-center px-1 text-base-content/50">
							<MoreHorizontal className="size-4" />
						</span>
					</BreadcrumbItem>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
