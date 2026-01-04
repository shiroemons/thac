import { createFileRoute } from "@tanstack/react-router";
import { HeroSection, RecentReleases, StatsCards } from "@/components/public";

export const Route = createFileRoute("/_public/")({
	head: () => ({
		meta: [{ title: "東方編曲録　〜 Arrangement Chronicle" }],
	}),
	component: HomePage,
});

function HomePage() {
	return (
		<div className="space-y-8">
			<HeroSection />
			<StatsCards />
			<RecentReleases />
		</div>
	);
}
