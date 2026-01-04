import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "../theme-switcher";
import UserMenu from "../user-menu";

const navLinks = [
	{ to: "/original-songs", label: "原曲" },
	{ to: "/circles", label: "サークル" },
	{ to: "/artists", label: "アーティスト" },
	{ to: "/events", label: "イベント" },
	{ to: "/stats", label: "統計" },
] as const;

export function PublicHeader() {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const location = useLocation();

	const isActive = (path: string) => location.pathname.startsWith(path);

	return (
		<header className="navbar sticky top-0 z-50 bg-base-100 shadow-sm">
			{/* Mobile menu button */}
			<div className="navbar-start">
				<button
					type="button"
					className="btn btn-ghost btn-circle lg:hidden"
					aria-label="メニューを開く"
					onClick={() => setIsDrawerOpen(true)}
				>
					<Menu className="size-5" />
				</button>
				<Link to="/" className="btn btn-ghost font-bold text-lg">
					東方編曲録
				</Link>
			</div>

			{/* Desktop navigation */}
			<nav className="navbar-center hidden lg:flex">
				<ul className="menu menu-horizontal gap-1 px-1">
					{navLinks.map(({ to, label }) => (
						<li key={to}>
							<Link
								to={to}
								className={
									isActive(to) ? "bg-base-200 font-semibold" : undefined
								}
							>
								{label}
							</Link>
						</li>
					))}
				</ul>
			</nav>

			{/* Right side */}
			<div className="navbar-end gap-1">
				<Link
					to="/search"
					className="btn btn-ghost btn-circle"
					aria-label="検索"
				>
					<Search className="size-5" />
				</Link>
				<ThemeSwitcher />
				<UserMenu />
			</div>

			{/* Mobile drawer */}
			{isDrawerOpen && (
				<div className="fixed inset-0 z-50 lg:hidden">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/50"
						onClick={() => setIsDrawerOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setIsDrawerOpen(false)}
						role="button"
						tabIndex={0}
						aria-label="メニューを閉じる"
					/>
					{/* Drawer */}
					<aside className="absolute top-0 left-0 h-full w-64 bg-base-100 shadow-xl">
						<div className="flex items-center justify-between p-4">
							<span className="font-bold text-lg">メニュー</span>
							<button
								type="button"
								className="btn btn-ghost btn-circle btn-sm"
								aria-label="メニューを閉じる"
								onClick={() => setIsDrawerOpen(false)}
							>
								<X className="size-5" />
							</button>
						</div>
						<ul className="menu p-4">
							<li>
								<Link to="/" onClick={() => setIsDrawerOpen(false)}>
									ホーム
								</Link>
							</li>
							{navLinks.map(({ to, label }) => (
								<li key={to}>
									<Link
										to={to}
										className={isActive(to) ? "active" : undefined}
										onClick={() => setIsDrawerOpen(false)}
									>
										{label}
									</Link>
								</li>
							))}
							<li className="mt-4 border-base-300 border-t pt-4">
								<Link to="/about" onClick={() => setIsDrawerOpen(false)}>
									About
								</Link>
							</li>
						</ul>
					</aside>
				</div>
			)}
		</header>
	);
}
