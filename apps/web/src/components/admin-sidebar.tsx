import { Link, useLocation } from "@tanstack/react-router";
import {
	Database,
	Disc,
	FolderOpen,
	LayoutDashboard,
	MonitorSmartphone,
	Music,
	UserCog,
	Users,
} from "lucide-react";

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
			{ to: "/admin/master/alias-types", label: "別名義種別", icon: Users },
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
];

interface AdminSidebarProps {
	onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
	const location = useLocation();

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
		<aside className="min-h-full w-64 bg-base-200">
			<div className="p-4">
				<span className="font-bold text-xl">管理画面</span>
			</div>
			<ul className="menu w-full p-4 pt-0">
				{navItems.map((entry) =>
					isNavGroup(entry) ? (
						<li key={entry.label} className="w-full">
							<details open={isGroupActive(entry)} className="w-full">
								<summary className="w-full">
									<entry.icon className="size-5" />
									<span className="flex-1 text-left">{entry.label}</span>
								</summary>
								<ul>
									{entry.items.map(({ to, label, icon: Icon }) => (
										<li key={to}>
											<Link
												to={to}
												onClick={onNavigate}
												className={
													isActive(to)
														? "active bg-base-content/10 font-medium"
														: ""
												}
											>
												<Icon className="size-4" />
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
								className={
									isActive(entry.to)
										? "active bg-base-content/10 font-medium"
										: ""
								}
							>
								<entry.icon className="size-5" />
								{entry.label}
							</Link>
						</li>
					),
				)}
			</ul>
		</aside>
	);
}
