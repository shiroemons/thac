import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

interface Release {
	id: string;
	title: string;
	circleName: string;
	eventName: string;
	imageUrl?: string;
}

// Mock data for demonstration
const mockReleases: Release[] = [
	{
		id: "1",
		title: "東方夢幻録",
		circleName: "サークルA",
		eventName: "C105",
	},
	{
		id: "2",
		title: "紅魔館の夜",
		circleName: "サークルB",
		eventName: "C105",
	},
	{
		id: "3",
		title: "幻想郷の音",
		circleName: "サークルC",
		eventName: "例大祭21",
	},
	{
		id: "4",
		title: "月夜の旋律",
		circleName: "サークルD",
		eventName: "C104",
	},
	{
		id: "5",
		title: "永遠亭アレンジ",
		circleName: "サークルE",
		eventName: "C104",
	},
	{
		id: "6",
		title: "地霊殿リミックス",
		circleName: "サークルF",
		eventName: "紅楼夢18",
	},
];

function ReleaseCard({ release }: { release: Release }) {
	return (
		<div className="block min-w-[200px] flex-shrink-0 cursor-pointer snap-start">
			<div className="overflow-hidden rounded-box bg-base-100 shadow-sm transition-shadow hover:shadow-md">
				{/* Placeholder image */}
				<div className="flex aspect-square items-center justify-center bg-base-200">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-12 w-12 text-base-content/30"
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
				</div>
				<div className="p-3">
					<h3 className="truncate font-medium text-sm">{release.title}</h3>
					<p className="truncate text-base-content/70 text-xs">
						{release.circleName}
					</p>
					<p className="mt-1 text-base-content/50 text-xs">
						{release.eventName}
					</p>
				</div>
			</div>
		</div>
	);
}

export function RecentReleases() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);

	const handleScroll = () => {
		if (!scrollRef.current) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
	};

	const scroll = (direction: "left" | "right") => {
		if (!scrollRef.current) return;
		const scrollAmount = 220; // Card width + gap
		scrollRef.current.scrollBy({
			left: direction === "left" ? -scrollAmount : scrollAmount,
			behavior: "smooth",
		});
	};

	return (
		<section className="py-8">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-bold text-xl">最近のリリース</h2>
				<Link
					to="/stats"
					className="flex items-center gap-1 text-primary text-sm hover:underline"
				>
					すべて見る
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</Link>
			</div>

			<div className="relative">
				{/* Scroll buttons for desktop */}
				{canScrollLeft && (
					<button
						type="button"
						onClick={() => scroll("left")}
						className="absolute top-1/2 left-0 z-10 hidden -translate-y-1/2 rounded-full bg-base-100 p-2 shadow-lg transition-transform hover:scale-110 md:block"
						aria-label="前へ"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
				)}
				{canScrollRight && (
					<button
						type="button"
						onClick={() => scroll("right")}
						className="absolute top-1/2 right-0 z-10 hidden -translate-y-1/2 rounded-full bg-base-100 p-2 shadow-lg transition-transform hover:scale-110 md:block"
						aria-label="次へ"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				)}

				{/* Scrollable container */}
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 md:mx-0 md:px-0"
				>
					{mockReleases.map((release) => (
						<ReleaseCard key={release.id} release={release} />
					))}
				</div>
			</div>
		</section>
	);
}
