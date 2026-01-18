import { Link } from "@tanstack/react-router";
import {
	Calendar,
	Disc3,
	Search,
	Sparkles,
	UserRound,
	Users,
} from "lucide-react";
import type { PublicStats } from "@/lib/public-api";
import { Badge } from "../ui/badge";

interface HeroSectionProps {
	stats: PublicStats | null;
}

interface StatLinkProps {
	href: string;
	count: number;
	label: string;
	icon?: React.ReactNode;
}

function StatLink({ href, count, label, icon }: StatLinkProps) {
	return (
		<Link
			to={href}
			preload="render"
			className="group flex items-center gap-2 transition-colors hover:text-primary"
		>
			{icon}
			<span>
				<span className="font-semibold text-base-content group-hover:text-primary">
					{count.toLocaleString()}
				</span>{" "}
				{label}
			</span>
		</Link>
	);
}

export function HeroSection({ stats }: HeroSectionProps) {
	const displayStats: PublicStats = {
		events: stats?.events ?? 0,
		circles: stats?.circles ?? 0,
		artists: stats?.artists ?? 0,
		tracks: stats?.tracks ?? 0,
		originalSongs: stats?.originalSongs ?? 0,
		releases: stats?.releases ?? 0,
	};

	return (
		<section className="relative flex h-[calc(100vh-4rem)] flex-col justify-center overflow-hidden px-4 py-12">
			{/* Gradient mesh background */}
			<div className="gradient-hero absolute inset-0" />

			{/* Floating decorative elements */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 left-1/6 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl" />
				<div className="animation-delay-1000 absolute right-1/6 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-secondary/10 blur-3xl" />
				<div className="animation-delay-2000 absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 animate-pulse rounded-full bg-accent/10 blur-2xl" />
			</div>

			<div className="relative mx-auto max-w-4xl text-center">
				{/* Badge */}
				<Badge
					variant="primary"
					className="mb-6 inline-flex items-center gap-2 bg-primary px-4 py-2 text-primary-content"
				>
					<Sparkles className="size-4" aria-hidden="true" />
					<span>東方アレンジ楽曲データベース</span>
				</Badge>

				{/* Main title with gradient */}
				<h1 className="mb-4 font-bold text-5xl tracking-tight md:text-6xl lg:text-7xl">
					<span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
						東方編曲録
					</span>
				</h1>

				<p className="mb-2 text-base-content/60 text-xl md:text-2xl">
					Touhou Arrangement Chronicle
				</p>

				<p className="mx-auto mb-10 max-w-2xl text-base text-base-content/60 md:text-lg">
					東方Projectの二次創作楽曲を網羅したデータベース。
					<br className="hidden sm:block" />
					原曲、サークル、アーティスト情報を検索できます。
				</p>

				{/* Search bar */}
				<div className="mx-auto max-w-2xl">
					<Link
						to="/search"
						preload="render"
						className="group flex w-full items-center gap-4 rounded-2xl border-2 border-primary/30 bg-base-100 px-6 py-5 shadow-xl transition-all duration-300 hover:border-primary hover:shadow-2xl"
					>
						<div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-content transition-transform group-hover:scale-110">
							<Search className="size-6" aria-hidden="true" />
						</div>
						<span className="flex-1 text-left text-base-content/70 text-lg transition-colors group-hover:text-base-content">
							アーティスト、曲名、サークル名で検索...
						</span>
						<kbd className="hidden rounded-lg border border-base-content/20 bg-base-200 px-3 py-2 font-mono text-base-content/60 text-sm sm:inline-block">
							⌘K
						</kbd>
					</Link>
				</div>

				{/* Stats with links */}
				<div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-base-content/60 text-sm md:gap-6">
					<StatLink
						href="/events"
						count={displayStats.events}
						label="イベント"
						icon={
							<Calendar
								className="size-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/circles"
						count={displayStats.circles}
						label="サークル"
						icon={
							<Users
								className="size-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/artists"
						count={displayStats.artists}
						label="アーティスト"
						icon={
							<UserRound
								className="size-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					{/* 作品（リンクなし） */}
					<div className="flex items-center gap-2">
						<Disc3 className="size-4 text-primary" aria-hidden="true" />
						<span>
							<span className="font-semibold text-base-content">
								{displayStats.releases.toLocaleString()}
							</span>{" "}
							作品
						</span>
					</div>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					{/* アレンジ（リンクなし） */}
					<div className="flex items-center gap-2">
						<Disc3 className="size-4 text-primary" aria-hidden="true" />
						<span>
							<span className="font-semibold text-base-content">
								{displayStats.tracks.toLocaleString()}
							</span>{" "}
							アレンジ
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
