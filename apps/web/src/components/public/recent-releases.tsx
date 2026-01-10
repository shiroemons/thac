import { Link } from "@tanstack/react-router";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Disc3,
	Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface Release {
	id: string;
	title: string;
	circleName: string;
	eventName: string;
	imageUrl?: string;
	isNew?: boolean;
}

// Mock data for demonstration
const mockReleases: Release[] = [
	{
		id: "1",
		title: "東方夢幻録",
		circleName: "サークルA",
		eventName: "C105",
		isNew: true,
	},
	{
		id: "2",
		title: "紅魔館の夜",
		circleName: "サークルB",
		eventName: "C105",
		isNew: true,
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
		<div className="min-w-[180px] flex-shrink-0 snap-start sm:min-w-[200px]">
			<Card className="group h-full overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
				{/* Album art placeholder */}
				<div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20">
					<div className="flex h-full items-center justify-center">
						<Disc3
							className="h-16 w-16 text-base-content/20 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
							aria-hidden="true"
						/>
					</div>
					{release.isNew && (
						<div className="absolute top-2 right-2">
							<Badge
								variant="primary"
								className="flex items-center gap-1 bg-primary px-2 py-0.5 text-primary-content shadow-lg"
							>
								<Sparkles className="h-3 w-3" aria-hidden="true" />
								NEW
							</Badge>
						</div>
					)}
					{/* Overlay on hover */}
					<div className="absolute inset-0 flex items-center justify-center bg-base-content/0 opacity-0 transition-all duration-300 group-hover:bg-base-content/10 group-hover:opacity-100">
						<div className="translate-y-2 transform rounded-full bg-primary px-4 py-2 font-medium text-primary-content text-sm opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
							詳細を見る
						</div>
					</div>
				</div>
				<div className="p-4">
					<h3 className="mb-1 truncate font-semibold text-sm transition-colors group-hover:text-primary">
						{release.title}
					</h3>
					<p className="truncate text-base-content/60 text-xs">
						{release.circleName}
					</p>
					<div className="mt-2 flex items-center gap-1 text-base-content/40 text-xs">
						<Calendar className="h-3 w-3" aria-hidden="true" />
						<span>{release.eventName}</span>
					</div>
				</div>
			</Card>
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
		const scrollAmount = 220;
		scrollRef.current.scrollBy({
			left: direction === "left" ? -scrollAmount : scrollAmount,
			behavior: "smooth",
		});
	};

	return (
		<section className="py-8">
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="font-bold text-xl">最近のリリース</h2>
					<Badge variant="primary" className="bg-primary/10 text-primary">
						{mockReleases.length}件
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					{/* Desktop scroll buttons */}
					<div className="hidden items-center gap-1 md:flex">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => scroll("left")}
							disabled={!canScrollLeft}
							aria-label="前へ"
							className="h-8 w-8 rounded-full"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => scroll("right")}
							disabled={!canScrollRight}
							aria-label="次へ"
							className="h-8 w-8 rounded-full"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
					<Link
						to="/stats"
						className="group flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary/80"
					>
						すべて見る
						<span className="transition-transform group-hover:translate-x-0.5">
							→
						</span>
					</Link>
				</div>
			</div>

			<div className="relative">
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

				{/* Fade edges indicator */}
				{canScrollRight && (
					<div className="pointer-events-none absolute top-0 right-0 hidden h-full w-16 bg-gradient-to-l from-base-100 to-transparent md:block" />
				)}
				{canScrollLeft && (
					<div className="pointer-events-none absolute top-0 left-0 hidden h-full w-16 bg-gradient-to-r from-base-100 to-transparent md:block" />
				)}
			</div>
		</section>
	);
}
