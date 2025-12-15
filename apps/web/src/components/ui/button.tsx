import type * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
	| "default"
	| "primary"
	| "secondary"
	| "accent"
	| "ghost"
	| "link"
	| "outline"
	| "destructive"
	| "success"
	| "warning"
	| "info";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
	default: "",
	primary: "btn-primary",
	secondary: "btn-secondary",
	accent: "btn-accent",
	ghost: "btn-ghost",
	link: "btn-link",
	outline: "btn-outline",
	destructive: "btn-error",
	success: "btn-success",
	warning: "btn-warning",
	info: "btn-info",
};

const sizeClasses: Record<ButtonSize, string> = {
	xs: "btn-xs",
	sm: "btn-sm",
	md: "",
	lg: "btn-lg",
	icon: "btn-square btn-sm",
};

interface ButtonProps extends React.ComponentProps<"button"> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	asChild?: boolean;
}

function Button({
	className,
	variant = "default",
	size = "md",
	asChild = false,
	children,
	...props
}: ButtonProps) {
	// asChild is kept for API compatibility but not fully implemented
	// since daisyUI doesn't use Radix primitives
	if (asChild) {
		// For asChild, return children with button classes applied
		// This is a simplified implementation
		return (
			<span
				className={cn(
					"btn",
					variantClasses[variant],
					sizeClasses[size],
					className,
				)}
			>
				{children}
			</span>
		);
	}

	return (
		<button
			type="button"
			data-slot="button"
			className={cn(
				"btn",
				variantClasses[variant],
				sizeClasses[size],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
