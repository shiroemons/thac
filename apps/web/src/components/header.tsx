import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div className="navbar bg-base-100 shadow-sm">
			{/* Mobile menu */}
			<div className="navbar-start">
				<div className="dropdown lg:hidden">
					<div
						tabIndex={0}
						role="button"
						className="btn btn-ghost btn-circle"
						aria-label="メニューを開く"
					>
						<Menu className="size-5" />
					</div>
					<ul
						role="menu"
						className="dropdown-content menu menu-sm z-50 mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
					>
						{links.map(({ to, label }) => (
							<li key={to}>
								<Link to={to}>{label}</Link>
							</li>
						))}
					</ul>
				</div>
				<Link to="/" className="btn btn-ghost text-xl">
					My App
				</Link>
			</div>

			{/* Desktop navigation */}
			<div className="navbar-center hidden lg:flex">
				<ul className="menu menu-horizontal px-1">
					{links.map(({ to, label }) => (
						<li key={to}>
							<Link
								to={to}
								className="[&.active]:bg-base-200 [&.active]:font-semibold"
							>
								{label}
							</Link>
						</li>
					))}
				</ul>
			</div>

			{/* Right side */}
			<div className="navbar-end gap-2">
				<ThemeSwitcher />
				<UserMenu />
			</div>
		</div>
	);
}
