import { createFileRoute } from "@tanstack/react-router";
import {
	FeaturesSection,
	HeroSection,
	NavigationSection,
} from "@/components/public";
import { type PublicStats, publicApi } from "@/lib/public-api";

export const Route = createFileRoute("/_public/")({
	head: () => ({
		meta: [{ title: "東方編曲録　〜 Arrangement Chronicle" }],
	}),
	loader: async (): Promise<{ stats: PublicStats | null }> => {
		try {
			const stats = await publicApi.stats();
			return { stats };
		} catch {
			return { stats: null };
		}
	},
	component: HomePage,
});

function HomePage() {
	const { stats } = Route.useLoaderData();
	return (
		<div className="scrollbar-hide -mx-4 -my-6 h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-auto">
			<div className="snap-start">
				<HeroSection stats={stats} />
			</div>
			<div className="snap-start">
				<FeaturesSection />
			</div>
			<div className="snap-start">
				<NavigationSection />
			</div>
		</div>
	);
}
