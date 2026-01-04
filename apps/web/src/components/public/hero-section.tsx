import { Link } from "@tanstack/react-router";
import { Calendar, Disc3, Music, Search, Sparkles, Users } from "lucide-react";

// Mock data for demonstration
const mockStats = {
	originalSongs: 1234,
	events: 567,
	circles: 456,
	artists: 890,
	tracks: 12345,
};

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

export function HeroSection() {
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
				<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary text-sm">
					<Sparkles className="h-4 w-4" aria-hidden="true" />
					<span>東方アレンジ楽曲データベース</span>
				</div>

				{/* Main title with gradient */}
				<h1 className="mb-4 font-bold text-5xl tracking-tight md:text-6xl lg:text-7xl">
					<span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
						東方編曲録
					</span>
				</h1>

				<p className="mb-2 text-base-content/60 text-xl md:text-2xl">
					Touhou Arrangement Chronicle
				</p>

				<p className="mx-auto mb-10 max-w-2xl text-base text-base-content/50 md:text-lg">
					東方Projectの二次創作楽曲を網羅したデータベース。
					<br className="hidden sm:block" />
					原曲、サークル、アーティスト情報を検索できます。
				</p>

				{/* Glass search bar */}
				<div className="mx-auto max-w-xl">
					<Link
						to="/search"
						className="glass-card-strong group flex w-full items-center gap-4 rounded-2xl px-6 py-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-primary/20"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
							<Search className="h-5 w-5" aria-hidden="true" />
						</div>
						<span className="flex-1 text-left text-base-content/50 transition-colors group-hover:text-base-content/70">
							アーティスト、曲名、サークル名で検索...
						</span>
						<kbd className="hidden rounded-lg border border-base-content/10 bg-base-content/5 px-2.5 py-1.5 font-mono text-base-content/40 text-xs sm:inline-block">
							⌘K
						</kbd>
					</Link>
				</div>

				{/* Stats with links */}
				<div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-base-content/50 text-sm md:gap-6">
					<StatLink
						href="/original-songs"
						count={mockStats.originalSongs}
						label="原曲"
						icon={
							<Music
								className="h-4 w-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/events"
						count={mockStats.events}
						label="イベント"
						icon={
							<Calendar
								className="h-4 w-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/circles"
						count={mockStats.circles}
						label="サークル"
						icon={
							<Users
								className="h-4 w-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/artists"
						count={mockStats.artists}
						label="アーティスト"
						icon={
							<Users
								className="h-4 w-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
					<div className="h-4 w-px bg-base-content/20" aria-hidden="true" />
					<StatLink
						href="/stats"
						count={mockStats.tracks}
						label="トラック"
						icon={
							<Disc3
								className="h-4 w-4 text-primary group-hover:text-primary"
								aria-hidden="true"
							/>
						}
					/>
				</div>
			</div>
		</section>
	);
}
