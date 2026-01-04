import { Link } from "@tanstack/react-router";

interface StatCardProps {
	icon: React.ReactNode;
	count: number;
	label: string;
	href?: string;
}

function StatCard({ icon, count, label, href }: StatCardProps) {
	const content = (
		<div className="flex flex-col items-center gap-2 rounded-box bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md">
			<div className="text-2xl text-primary">{icon}</div>
			<div className="font-bold text-2xl">{count.toLocaleString()}</div>
			<div className="text-base-content/70 text-sm">{label}</div>
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
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<StatCard
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>
					}
					count={mockStats.originalSongs}
					label="原曲"
					href="/original-songs"
				/>
				<StatCard
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					}
					count={mockStats.events}
					label="イベント"
					href="/events"
				/>
				<StatCard
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					}
					count={mockStats.circles}
					label="サークル"
					href="/circles"
				/>
				<StatCard
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					}
					count={mockStats.artists}
					label="アーティスト"
					href="/artists"
				/>
				<StatCard
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
							/>
						</svg>
					}
					count={mockStats.tracks}
					label="トラック"
					href="/stats"
				/>
			</div>
		</section>
	);
}
