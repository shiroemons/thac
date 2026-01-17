import { Link } from "@tanstack/react-router";
import { Badge, type BadgeVariant } from "../ui/badge";
import { Card } from "../ui/card";

export interface BadgeInfo {
	label: string;
	variant: "primary" | "secondary" | "accent" | "ghost";
}

interface EntityCardProps {
	href: string;
	title: string;
	subtitle?: string;
	badges?: BadgeInfo[];
	meta?: string;
	image?: string;
}

export function EntityCard({
	href,
	title,
	subtitle,
	badges,
	meta,
	image,
}: EntityCardProps) {
	return (
		<Link to={href} preload="intent" className="block">
			<Card className="transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
				{image && (
					<figure className="aspect-square bg-base-200">
						<img src={image} alt={title} className="size-full object-cover" />
					</figure>
				)}
				<div className="card-body p-4">
					<h3 className="card-title text-base">{title}</h3>
					{subtitle && (
						<p className="text-base-content/70 text-sm">{subtitle}</p>
					)}
					{badges && badges.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{badges.map((badge) => (
								<Badge
									key={badge.label}
									variant={badge.variant as BadgeVariant}
									className="badge-sm"
								>
									{badge.label}
								</Badge>
							))}
						</div>
					)}
					{meta && <p className="text-base-content/60 text-sm">{meta}</p>}
				</div>
			</Card>
		</Link>
	);
}
