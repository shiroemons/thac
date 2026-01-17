import { Link, useLocation } from "@tanstack/react-router";
import {
	Calendar,
	Database,
	Disc,
	Disc3,
	FolderOpen,
	Import,
	Layers,
	LayoutDashboard,
	MonitorSmartphone,
	Music,
	UserCog,
	UserRound,
	UserRoundPen,
	Users,
	UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
	return "items" in entry;
};

const navItems: NavEntry[] = [
	{ to: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
	{
		label: "マスタ管理",
		icon: Database,
		items: [
			{
				to: "/admin/master/platforms",
				label: "プラットフォーム",
				icon: MonitorSmartphone,
			},
			{ to: "/admin/master/alias-types", label: "名義種別", icon: Users },
			{
				to: "/admin/master/credit-roles",
				label: "クレジット役割",
				icon: UserCog,
			},
			{
				to: "/admin/master/official-work-categories",
				label: "公式作品カテゴリ",
				icon: FolderOpen,
			},
		],
	},
	{
		label: "公式管理",
		icon: Disc,
		items: [
			{
				to: "/admin/official/works",
				label: "公式作品",
				icon: Disc,
			},
			{
				to: "/admin/official/songs",
				label: "公式楽曲",
				icon: Music,
			},
		],
	},
	{
		label: "イベント管理",
		icon: Calendar,
		items: [
			{
				to: "/admin/event-series",
				label: "イベントシリーズ",
				icon: Layers,
			},
			{
				to: "/admin/events",
				label: "イベント",
				icon: Calendar,
			},
		],
	},
	{
		label: "アーティスト・サークル",
		icon: UsersRound,
		items: [
			{
				to: "/admin/artists",
				label: "アーティスト",
				icon: UserRound,
			},
			{
				to: "/admin/artist-aliases",
				label: "アーティスト名義",
				icon: UserRoundPen,
			},
			{
				to: "/admin/circles",
				label: "サークル",
				icon: Users,
			},
		],
	},
	{
		label: "作品管理",
		icon: Disc3,
		items: [
			{
				to: "/admin/releases",
				label: "作品",
				icon: Disc3,
			},
			{
				to: "/admin/tracks",
				label: "トラック",
				icon: Music,
			},
		],
	},
	{
		label: "インポート",
		icon: Import,
		items: [
			{
				to: "/admin/import-legacy",
				label: "レガシーCSV",
				icon: Import,
			},
		],
	},
];

interface AdminSidebarProps {
	onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
	const location = useLocation();

	const activeItemClasses =
		"border-l-3 border-primary bg-primary/10 text-primary font-medium";
	const inactiveItemClasses =
		"border-l-3 border-transparent hover:bg-base-content/5";

	const isActive = (path: string) => {
		if (path === "/admin") {
			return location.pathname === "/admin";
		}
		return location.pathname.startsWith(path);
	};

	const isGroupActive = (group: NavGroup) => {
		return group.items.some((item) => isActive(item.to));
	};

	return (
		<aside className="flex min-h-full w-64 flex-col bg-base-200">
			<div className="border-base-300 border-b px-4 py-5">
				<span className="font-bold text-xl">管理画面</span>
			</div>
			<nav className="flex-1 overflow-y-auto">
				<ul className="menu gap-1 p-4">
					{navItems.map((entry) =>
						isNavGroup(entry) ? (
							<li key={entry.label}>
								<details open={isGroupActive(entry)}>
									<summary
										className={cn(
											"gap-3 rounded-lg py-2.5",
											isGroupActive(entry) && "font-medium text-primary",
										)}
									>
										<entry.icon className="size-[18px]" />
										<span className="flex-1">{entry.label}</span>
									</summary>
									<ul className="mt-1 ml-2 space-y-0.5 border-base-300 border-l">
										{entry.items.map(({ to, label, icon: Icon }) => (
											<li key={to}>
												<Link
													to={to}
													onClick={onNavigate}
													className={cn(
														"gap-2 rounded-lg py-2 pl-4",
														isActive(to)
															? activeItemClasses
															: inactiveItemClasses,
													)}
												>
													<Icon className="size-[18px]" />
													{label}
												</Link>
											</li>
										))}
									</ul>
								</details>
							</li>
						) : (
							<li key={entry.to}>
								<Link
									to={entry.to}
									onClick={onNavigate}
									className={cn(
										"gap-3 rounded-lg py-2.5",
										isActive(entry.to)
											? activeItemClasses
											: inactiveItemClasses,
									)}
								>
									<entry.icon className="size-[18px]" />
									{entry.label}
								</Link>
							</li>
						),
					)}
				</ul>
			</nav>
		</aside>
	);
}
