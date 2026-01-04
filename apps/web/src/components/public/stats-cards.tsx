import { Link } from "@tanstack/react-router";
import {
	Calendar,
	Disc3,
	type LucideIcon,
	Music,
	TrendingUp,
	Users,
} from "lucide-react";
import { formatNumber } from "../../lib/format";

interface StatCardProps {
	icon: LucideIcon;
	count: number;
	label: string;
	href?: string;
	trend?: number;
}

function StatCard({ icon: Icon, count, label, href, trend }: StatCardProps) {
	const content = (
		<div className="glass-card group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
			<div className="flex items-center justify-between">
				<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
					<Icon className="h-5 w-5" aria-hidden="true" />
				</div>
				{trend !== undefined && (
					<div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-success text-xs">
						<TrendingUp className="h-3 w-3" aria-hidden="true" />
						<span>+{trend}%</span>
					</div>
				)}
			</div>
			<div>
				<div className="font-bold text-2xl tracking-tight md:text-3xl">
					{formatNumber(count)}
				</div>
				<div className="mt-1 text-base-content/60 text-sm">{label}</div>
			</div>
		</div>
	);

	if (href) {
		return (
			<Link to={href} className="block">
				{content}
			</Link>
		);
	}

	return content;
}

// Mock data for demonstration
const mockStats = {
	originalSongs: 1234,
	events: 567,
	circles: 456,
	artists: 890,
	tracks: 12345,
};

export function StatsCards() {
	return (
		<section className="py-8">
			<div className="mb-6 flex items-center justify-between">
				<h2 className="font-bold text-xl">データ統計</h2>
				<Link
					to="/stats"
					className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary/80"
				>
					詳細を見る
					<span className="transition-transform group-hover:translate-x-0.5">
						→
					</span>
				</Link>
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<StatCard
					icon={Music}
					count={mockStats.originalSongs}
					label="原曲"
					href="/original-songs"
				/>
				<StatCard
					icon={Calendar}
					count={mockStats.events}
					label="イベント"
					href="/events"
				/>
				<StatCard
					icon={Users}
					count={mockStats.circles}
					label="サークル"
					href="/circles"
				/>
				<StatCard
					icon={Users}
					count={mockStats.artists}
					label="アーティスト"
					href="/artists"
				/>
				<StatCard
					icon={Disc3}
					count={mockStats.tracks}
					label="トラック"
					href="/stats"
					trend={12}
				/>
			</div>
		</section>
	);
}
