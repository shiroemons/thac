import { Link, useLocation } from "@tanstack/react-router";
import {
	FolderOpen,
	LayoutDashboard,
	MonitorSmartphone,
	UserCog,
	Users,
} from "lucide-react";

const navItems = [
	{ to: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
	{
		to: "/admin/master/platforms",
		label: "プラットフォーム",
		icon: MonitorSmartphone,
	},
	{ to: "/admin/master/alias-types", label: "別名義種別", icon: Users },
	{ to: "/admin/master/credit-roles", label: "クレジット役割", icon: UserCog },
	{
		to: "/admin/master/official-work-categories",
		label: "公式作品カテゴリ",
		icon: FolderOpen,
	},
] as const;

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

	return (
		<aside className="min-h-full w-64 bg-base-200">
			<div className="p-4">
				<span className="font-bold text-xl">管理画面</span>
			</div>
			<ul className="menu p-4 pt-0">
				{navItems.map(({ to, label, icon: Icon }) => (
					<li key={to}>
						<Link
							to={to}
							onClick={onNavigate}
							className={isActive(to) ? "active" : ""}
						>
							<Icon className="size-5" />
							{label}
						</Link>
					</li>
				))}
			</ul>
		</aside>
	);
}
