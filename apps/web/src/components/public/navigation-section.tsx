import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	Calendar,
	Disc3,
	Music,
	Search,
	Users,
} from "lucide-react";

const navItems = [
	{
		href: "/search",
		icon: Search,
		title: "楽曲を検索",
		description: "アーティスト、曲名、サークル名などで検索",
		color: "from-primary to-primary/70",
	},
	{
		href: "/original-songs",
		icon: Music,
		title: "原曲一覧",
		description: "東方Projectの全原曲を閲覧",
		color: "from-secondary to-secondary/70",
	},
	{
		href: "/events",
		icon: Calendar,
		title: "イベント",
		description: "即売会・イベント情報を確認",
		color: "from-accent to-accent/70",
	},
	{
		href: "/circles",
		icon: Users,
		title: "サークル",
		description: "同人音楽サークルを一覧",
		color: "from-info to-info/70",
	},
	{
		href: "/artists",
		icon: Disc3,
		title: "アーティスト",
		description: "作曲者・編曲者を検索",
		color: "from-success to-success/70",
	},
	{
		href: "/stats",
		icon: BarChart3,
		title: "統計情報",
		description: "データベースの統計を確認",
		color: "from-warning to-warning/70",
	},
];

export function NavigationSection() {
	return (
		<section className="relative flex h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 left-1/3 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
				<div className="absolute right-1/3 bottom-1/4 h-72 w-72 rounded-full bg-info/5 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl">
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
						<span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
							コンテンツを探索
						</span>
					</h2>
					<p className="mx-auto max-w-2xl text-base-content/60 text-lg">
						様々な角度から東方アレンジ楽曲の世界を探索できます
					</p>
				</div>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{navItems.map((item) => (
						<Link
							key={item.href}
							to={item.href}
							className="glass-card group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-primary/20"
						>
							{/* Gradient accent */}
							<div
								className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${item.color} opacity-0 transition-opacity group-hover:opacity-100`}
							/>

							<div className="flex items-start gap-4">
								<div
									className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white transition-transform duration-300 group-hover:scale-110`}
								>
									<item.icon className="h-6 w-6" aria-hidden="true" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="mb-1 font-bold text-lg">{item.title}</h3>
									<p className="text-base-content/60 text-sm">
										{item.description}
									</p>
								</div>
								<ArrowRight
									className="h-5 w-5 shrink-0 text-base-content/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary"
									aria-hidden="true"
								/>
							</div>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
