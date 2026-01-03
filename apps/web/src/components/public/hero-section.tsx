import { Link } from "@tanstack/react-router";

export function HeroSection() {
	return (
		<section className="py-16 text-center md:py-24">
			<div className="mx-auto max-w-3xl px-4">
				<h1 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
					東方編曲録
				</h1>
				<p className="mb-8 text-base-content/70 text-lg md:text-xl">
					Touhou Arrangement Chronicle
				</p>

				{/* Search Bar */}
				<div className="mx-auto max-w-xl">
					<Link
						to="/search"
						className="flex w-full items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-base-content/50"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<span className="text-base-content/50">
							アーティスト、曲名、サークル名で検索...
						</span>
					</Link>
				</div>
			</div>
		</section>
	);
}
