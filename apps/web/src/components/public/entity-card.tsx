import { Link } from "@tanstack/react-router";

export interface Badge {
	label: string;
	variant: "primary" | "secondary" | "accent" | "ghost";
}

interface EntityCardProps {
	href: string;
	title: string;
	subtitle?: string;
	badges?: Badge[];
	meta?: string;
	image?: string;
}

const badgeVariantClass: Record<Badge["variant"], string> = {
	primary: "badge-primary",
	secondary: "badge-secondary",
	accent: "badge-accent",
	ghost: "badge-ghost",
};

export function EntityCard({
	href,
	title,
	subtitle,
	badges,
	meta,
	image,
}: EntityCardProps) {
	return (
		<Link
			to={href}
			className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
		>
			{image && (
				<figure className="aspect-square bg-base-200">
					<img src={image} alt={title} className="size-full object-cover" />
				</figure>
			)}
			<div className="card-body p-4">
				<h3 className="card-title text-base">{title}</h3>
				{subtitle && <p className="text-base-content/70 text-sm">{subtitle}</p>}
				{badges && badges.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{badges.map((badge) => (
							<span
								key={badge.label}
								className={`badge badge-sm ${badgeVariantClass[badge.variant]}`}
							>
								{badge.label}
							</span>
						))}
					</div>
				)}
				{meta && <p className="text-base-content/50 text-sm">{meta}</p>}
			</div>
		</Link>
	);
}
