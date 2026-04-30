import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { FolderHeart, Heart, Settings, User } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import UserMenu from "@/components/user-menu";
import { getUser } from "@/functions/get-user";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/user/_user")({
	head: () => createPageHead("マイページ"),
	headers: () => CACHE_HEADERS.PRIVATE,
	beforeLoad: async () => {
		const session = await getUser();

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { returnTo: "/user/profile" },
			});
		}

		return { user: session.user };
	},
	component: UserLayout,
});

function UserLayout() {
	const { user } = Route.useRouteContext();

	return (
		<div className="flex min-h-screen flex-col">
			<header className="navbar sticky top-0 z-50 bg-base-100/70 backdrop-blur-sm">
				<div className="navbar-start">
					<Link to="/" className="btn btn-ghost font-bold text-lg">
						東方編曲録
					</Link>
				</div>
				<div className="navbar-end gap-1">
					<ThemeSwitcher />
					<UserMenu />
				</div>
			</header>
			<main className="flex-1 bg-base-200/30">
				<div className="mx-auto max-w-7xl p-4 lg:p-6">
					{/* Header */}
					<div className="mb-6">
						<h1 className="font-bold text-2xl">マイページ</h1>
						<p className="text-base-content/70 text-sm">{user.email}</p>
					</div>

					<div className="flex flex-col gap-6 lg:flex-row">
						{/* Sidebar Navigation */}
						<nav className="w-full lg:w-64">
							<ul className="menu menu-lg w-full rounded-box bg-base-100 p-2 shadow">
								<li>
									<NavLink
										to="/user/profile"
										icon={<User className="h-5 w-5" />}
									>
										プロフィール
									</NavLink>
								</li>
								<li>
									<NavLink
										to="/user/settings"
										icon={<Settings className="h-5 w-5" />}
									>
										設定
									</NavLink>
								</li>
								<li>
									<NavLink
										to="/user/collections"
										icon={<FolderHeart className="h-5 w-5" />}
									>
										コレクション
									</NavLink>
								</li>
								<li>
									<NavLink
										to="/user/likes"
										icon={<Heart className="h-5 w-5" />}
									>
										お気に入り
									</NavLink>
								</li>
							</ul>
						</nav>

						{/* Main Content */}
						<div className="flex-1">
							<Outlet />
						</div>
					</div>
				</div>
			</main>
			<footer className="bg-base-200 py-6 text-center text-base-content/60 text-sm">
				<p>
					&copy; {new Date().getFullYear()} 迷い家の白猫. All rights reserved.
				</p>
			</footer>
		</div>
	);
}

interface NavLinkProps {
	to: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}

function NavLink({ to, icon, children }: NavLinkProps) {
	return (
		<Link
			to={to}
			className={cn("flex items-center gap-2")}
			activeProps={{ className: "menu-active" }}
		>
			{icon}
			{children}
		</Link>
	);
}
