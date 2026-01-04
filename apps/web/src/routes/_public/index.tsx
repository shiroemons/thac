import { createFileRoute } from "@tanstack/react-router";
import {
	FeaturesSection,
	HeroSection,
	NavigationSection,
} from "@/components/public";

export const Route = createFileRoute("/_public/")({
	head: () => ({
		meta: [{ title: "東方編曲録　〜 Arrangement Chronicle" }],
	}),
	component: HomePage,
});

function HomePage() {
	return (
		<div className="scrollbar-hide -mx-4 -my-6 h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-auto">
			<div className="snap-start">
				<HeroSection />
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
