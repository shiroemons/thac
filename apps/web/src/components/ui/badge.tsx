import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
	| "default"
	| "primary"
	| "secondary"
	| "accent"
	| "ghost"
	| "outline"
	| "destructive";

const variantClasses: Record<BadgeVariant, string> = {
	default: "",
	primary: "badge-primary",
	secondary: "badge-secondary",
	accent: "badge-accent",
	ghost: "badge-ghost",
	outline: "badge-outline",
	destructive: "badge-error",
};

interface BadgeProps extends React.ComponentProps<"span"> {
	variant?: BadgeVariant;
	asChild?: boolean;
}

function Badge({
	className,
	variant = "default",
	asChild = false,
	...props
}: BadgeProps) {
	// asChild is kept for API compatibility
	return (
		<span
			data-slot="badge"
			className={cn("badge", variantClasses[variant], className)}
			{...props}
		/>
	);
}

export { Badge };
export type { BadgeProps, BadgeVariant };
