import { useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ThemeSwitcher } from "./theme-switcher";

interface AdminNavbarProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role: string;
	} | null;
}

export function AdminNavbar({ user }: AdminNavbarProps) {
	const navigate = useNavigate();

	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					toast.success("ログアウトしました");
					navigate({
						to: "/admin/login",
					});
				},
			},
		});
	};

	return (
		<div className="navbar bg-base-100 shadow-sm">
			<div className="navbar-start">
				{/* Mobile menu button */}
				<label
					htmlFor="admin-drawer"
					className="btn btn-ghost btn-circle drawer-button lg:hidden"
					aria-label="メニューを開く"
				>
					<Menu className="size-5" />
				</label>
				<span className="hidden font-bold text-lg lg:block">管理画面</span>
			</div>

			<div className="navbar-end gap-2">
				<ThemeSwitcher />
				{user && (
					<div className="dropdown dropdown-end">
						<div tabIndex={0} role="button" className="btn btn-ghost">
							{user.name || user.email}
						</div>
						<ul
							role="menu"
							className="dropdown-content menu z-50 w-52 rounded-box bg-base-100 p-2 shadow-lg"
						>
							<li className="menu-title">{user.email}</li>
							<li>
								<button
									type="button"
									onClick={handleLogout}
									className="text-error"
								>
									<LogOut className="size-4" />
									ログアウト
								</button>
							</li>
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}
