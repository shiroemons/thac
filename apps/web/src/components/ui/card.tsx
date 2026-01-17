import type * as React from "react";

import { cn } from "@/lib/utils";

// Card variants
type CardVariant = "default" | "glass" | "gradient" | "feature";
type GradientEntity =
	| "primary"
	| "secondary"
	| "accent"
	| "info"
	| "success"
	| "warning"
	| "error";

const variantClasses: Record<CardVariant, string> = {
	default: "border border-base-300 bg-base-100",
	glass: "glass-card border-0",
	gradient: "", // Gradient is applied dynamically based on entity
	feature: "border-2 border-accent/20 bg-base-100 shadow-xl hover:shadow-2xl",
};

const gradientEntityClasses: Record<GradientEntity, string> = {
	primary: "bg-gradient-to-br from-primary/10 via-base-100 to-primary/5",
	secondary: "bg-gradient-to-br from-secondary/10 via-base-100 to-secondary/5",
	accent: "bg-gradient-to-br from-accent/10 via-base-100 to-accent/5",
	info: "bg-gradient-to-br from-info/10 via-base-100 to-info/5",
	success: "bg-gradient-to-br from-success/10 via-base-100 to-success/5",
	warning: "bg-gradient-to-br from-warning/10 via-base-100 to-warning/5",
	error: "bg-gradient-to-br from-error/10 via-base-100 to-error/5",
};

// Hover effect types
type HoverEffect = "none" | "lift" | "glow" | "scale";

const hoverEffectClasses: Record<HoverEffect, string> = {
	none: "",
	lift: "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
	glow: "transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10",
	scale:
		"transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:ring-2 hover:ring-primary/10",
};

interface CardProps extends React.ComponentProps<"div"> {
	variant?: CardVariant;
	gradientEntity?: GradientEntity;
	hoverEffect?: HoverEffect;
}

function Card({
	className,
	variant = "default",
	gradientEntity = "primary",
	hoverEffect = "none",
	...props
}: CardProps) {
	const variantClass =
		variant === "gradient"
			? gradientEntityClasses[gradientEntity]
			: variantClasses[variant];

	return (
		<div
			data-slot="card"
			className={cn(
				"card rounded-2xl",
				variantClass,
				hoverEffectClasses[hoverEffect],
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn("card-body pb-0", className)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<h2
			data-slot="card-title"
			className={cn("card-title", className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="card-description"
			className={cn("text-base-content/70 text-sm", className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn("card-actions justify-end", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("card-body p-5 pt-0", className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn("card-actions justify-end px-6 pb-6", className)}
			{...props}
		/>
	);
}

// Icon animation types
type IconAnimation = "none" | "scale" | "rotate" | "bounce";

const iconAnimationClasses: Record<IconAnimation, string> = {
	none: "",
	scale: "transition-transform duration-300 group-hover:scale-110",
	rotate: "transition-transform duration-300 group-hover:rotate-3",
	bounce: "transition-transform duration-300 group-hover:-translate-y-0.5",
};

interface CardIconProps extends React.ComponentProps<"div"> {
	animation?: IconAnimation;
}

function CardIcon({ className, animation = "none", ...props }: CardIconProps) {
	return (
		<div
			data-slot="card-icon"
			className={cn(
				"flex items-center justify-center",
				iconAnimationClasses[animation],
				className,
			)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	CardIcon,
};
export type {
	CardProps,
	CardVariant,
	GradientEntity,
	HoverEffect,
	CardIconProps,
	IconAnimation,
};
