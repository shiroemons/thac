import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Settings, User } from "lucide-react";
import { getUser } from "@/functions/get-user";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/user/_user")({
	head: () => createPageHead("ユーザー設定"),
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
		<div className="min-h-screen bg-base-200/30">
			<div className="mx-auto max-w-4xl p-4 lg:p-6">
				{/* Header */}
				<div className="mb-6">
					<h1 className="font-bold text-2xl">アカウント設定</h1>
					<p className="text-base-content/70 text-sm">{user.email}</p>
				</div>

				<div className="flex flex-col gap-6 lg:flex-row">
					{/* Sidebar Navigation */}
					<nav className="w-full lg:w-64">
						<ul className="menu menu-lg w-full rounded-box bg-base-100 p-2 shadow">
							<li>
								<NavLink to="/user/profile" icon={<User className="h-5 w-5" />}>
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
						</ul>
					</nav>

					{/* Main Content */}
					<main className="flex-1">
						<Outlet />
					</main>
				</div>
			</div>
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
			activeProps={{ className: "active" }}
		>
			{icon}
			{children}
		</Link>
	);
}
