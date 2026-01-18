import { Link, useLocation } from "@tanstack/react-router";
import {
	BarChart3,
	Calendar,
	Home,
	Info,
	Menu,
	Music,
	Search,
	UserRound,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "../theme-switcher";
import UserMenu from "../user-menu";

const navLinks = [
	{ to: "/original-songs", label: "原曲", icon: Music },
	{ to: "/circles", label: "サークル", icon: Users },
	{ to: "/artists", label: "アーティスト", icon: UserRound },
	{ to: "/events", label: "イベント", icon: Calendar },
	{ to: "/stats", label: "統計", icon: BarChart3 },
] as const;

export function PublicHeader() {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const location = useLocation();

	const isActive = (path: string) => location.pathname.startsWith(path);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`navbar sticky top-0 z-50 transition-all duration-300 ${
				isScrolled
					? "glass-card-strong shadow-lg"
					: "bg-base-100/70 backdrop-blur-sm"
			}`}
		>
			{/* Mobile menu button */}
			<div className="navbar-start">
				<button
					type="button"
					className="btn btn-ghost btn-circle lg:hidden"
					aria-label="メニューを開く"
					aria-expanded={isDrawerOpen}
					aria-controls="mobile-drawer"
					onClick={() => setIsDrawerOpen(true)}
				>
					<Menu className="size-5" />
				</button>
				<Link
					to="/"
					preload="render"
					className="btn btn-ghost font-bold text-lg"
				>
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
								preload="render"
								className={`relative transition-all duration-300 hover:bg-base-200/60 ${
									isActive(to)
										? "bg-primary font-semibold text-primary-content after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:rounded-full after:bg-primary-content"
										: "text-base-content/70 hover:text-base-content"
								}`}
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
					preload="render"
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
				<div
					id="mobile-drawer"
					className="fixed inset-0 z-50 lg:hidden"
					role="dialog"
					aria-modal="true"
					aria-label="ナビゲーションメニュー"
				>
					{/* Backdrop with fade-in animation */}
					<div
						className="absolute inset-0 animate-[fadeIn_300ms_ease-out] bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
						onClick={() => setIsDrawerOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setIsDrawerOpen(false)}
						role="button"
						tabIndex={0}
						aria-label="メニューを閉じる（背景クリック）"
					/>
					{/* Drawer with slide-in animation */}
					<aside className="glass-card-strong absolute top-0 left-0 h-full w-72 animate-[slideInFromLeft_300ms_ease-out] shadow-2xl">
						<div className="flex items-center justify-between border-base-content/10 border-b p-4">
							<span className="font-bold text-lg">メニュー</span>
							<button
								type="button"
								className="btn btn-ghost btn-circle transition-all duration-300 hover:bg-base-200/60"
								aria-label="メニューを閉じる"
								onClick={() => setIsDrawerOpen(false)}
							>
								<X className="size-5" />
							</button>
						</div>
						<ul className="menu gap-1 p-4 [&_a]:min-h-12">
							<li>
								<Link
									to="/"
									preload="render"
									className={`flex items-center gap-3 transition-all duration-300 ${
										location.pathname === "/"
											? "bg-primary font-semibold text-primary-content"
											: "text-base-content/70 hover:bg-base-200/60 hover:text-base-content"
									}`}
									onClick={() => setIsDrawerOpen(false)}
								>
									<Home className="size-5" />
									ホーム
								</Link>
							</li>
							{navLinks.map(({ to, label, icon: Icon }) => (
								<li key={to}>
									<Link
										to={to}
										preload="render"
										className={`flex items-center gap-3 transition-all duration-300 ${
											isActive(to)
												? "bg-primary font-semibold text-primary-content"
												: "text-base-content/70 hover:bg-base-200/60 hover:text-base-content"
										}`}
										onClick={() => setIsDrawerOpen(false)}
									>
										<Icon className="size-5" />
										{label}
									</Link>
								</li>
							))}
							<li className="mt-4 border-base-content/10 border-t pt-4">
								<Link
									to="/about"
									preload="render"
									className="flex items-center gap-3 text-base-content/70 transition-all duration-300 hover:bg-base-200/60 hover:text-base-content"
									onClick={() => setIsDrawerOpen(false)}
								>
									<Info className="size-5" />
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
