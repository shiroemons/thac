import { Database, Music, Search, Users } from "lucide-react";
import { Card } from "../ui/card";

const features = [
	{
		icon: Search,
		title: "高速検索",
		description:
			"曲名、アーティスト、サークル、原曲など、あらゆる情報から楽曲を検索できます。",
	},
	{
		icon: Database,
		title: "充実のデータベース",
		description:
			"東方アレンジ楽曲の詳細な情報を網羅。原曲との関連付けも完備しています。",
	},
	{
		icon: Users,
		title: "アーティスト情報",
		description:
			"サークルやアーティストの活動情報を一覧できます。関連作品も簡単に辿れます。",
	},
	{
		icon: Music,
		title: "原曲リファレンス",
		description:
			"東方Projectの全原曲を収録。どの作品のどの曲がアレンジされているか把握できます。",
	},
];

export function FeaturesSection() {
	return (
		<section className="relative flex h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
				<div className="absolute bottom-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl">
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
						<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
							東方編曲録でできること
						</span>
					</h2>
					<p className="mx-auto max-w-2xl text-base-content/60 text-lg">
						東方Projectの二次創作楽曲に関するあらゆる情報を
						<br className="hidden sm:block" />
						簡単に検索・閲覧できます
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="group rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
						>
							<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
								<feature.icon className="h-7 w-7" aria-hidden="true" />
							</div>
							<h3 className="mb-2 font-bold text-xl">{feature.title}</h3>
							<p className="text-base-content/60">{feature.description}</p>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
