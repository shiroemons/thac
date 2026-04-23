import { Link } from "@tanstack/react-router";
import { Code2 } from "lucide-react";

const categoryLinks = [
	{ to: "/artists", label: "アーティスト" },
	{ to: "/circles", label: "サークル" },
	{ to: "/events", label: "イベント" },
	{ to: "/original-songs", label: "原曲" },
	{ to: "/stats", label: "統計" },
] as const;

const infoLinks = [
	{ to: "/about", label: "About" },
	{ to: "/privacy", label: "Privacy" },
] as const;

export function PublicFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="relative bg-base-200 px-3 py-8 text-base-content sm:px-6 sm:py-12">
			{/* Gradient background */}
			<div className="gradient-mesh absolute inset-0 opacity-50" />

			<div className="relative mx-auto max-w-6xl">
				{/* Main footer content */}
				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{/* Brand section */}
					<div className="sm:col-span-2 lg:col-span-1">
						<Link
							to="/"
							preload="render"
							className="inline-block font-bold text-xl transition-colors hover:text-primary"
						>
							東方編曲録
						</Link>
						<p className="mt-3 text-base-content/60 text-sm leading-relaxed">
							東方Projectの二次創作楽曲を網羅したデータベース。原曲、サークル、アーティスト情報を検索できます。
						</p>
					</div>

					{/* Category links */}
					<nav aria-label="カテゴリナビゲーション">
						<h3 className="mb-4 font-semibold text-base-content/70">
							カテゴリ
						</h3>
						<ul className="flex flex-col gap-2">
							{categoryLinks.map(({ to, label }) => (
								<li key={to}>
									<Link
										to={to}
										preload="render"
										className="link link-hover inline-flex min-h-11 items-center text-base-content/80 transition-colors hover:text-primary"
									>
										{label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Info links */}
					<nav aria-label="情報ナビゲーション">
						<h3 className="mb-4 font-semibold text-base-content/70">情報</h3>
						<ul className="flex flex-col gap-2">
							{infoLinks.map(({ to, label }) => (
								<li key={to}>
									<Link
										to={to}
										preload="render"
										className="link link-hover inline-flex min-h-11 items-center text-base-content/80 transition-colors hover:text-primary"
									>
										{label}
									</Link>
								</li>
							))}
							<li>
								<span className="inline-flex min-h-11 items-center text-base-content/40">
									Terms（準備中）
								</span>
							</li>
						</ul>
					</nav>

					{/* SNS links */}
					<div>
						<h3 className="mb-4 font-semibold text-base-content/70">
							フォローする
						</h3>
						<div className="flex gap-3">
							<a
								href="https://github.com/shiroemons/thac"
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-ghost btn-circle btn-sm hover:text-primary"
								aria-label="GitHub"
							>
								<Code2 className="size-5" aria-hidden="true" />
							</a>
						</div>
					</div>
				</div>

				{/* Divider */}
				<div className="mt-8 border-base-content/10 border-t pt-6 sm:mt-10 sm:pt-8">
					{/* Copyright */}
					<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
						<p className="text-base-content/60 text-sm">
							&copy; {currentYear} 迷い家の白猫. All rights reserved.
						</p>
						<p className="text-base-content/40 text-xs">
							Touhou Arrangement Chronicle
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
