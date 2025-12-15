import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			data-slot="breadcrumb"
			aria-label="パンくずリスト"
			className={cn("text-sm", className)}
			{...props}
		/>
	);
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn("flex items-center gap-1.5", className)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="breadcrumb-item"
			className={cn("flex items-center gap-1.5", className)}
			{...props}
		/>
	);
}

interface BreadcrumbLinkProps extends React.ComponentProps<typeof Link> {
	asChild?: boolean;
}

function BreadcrumbLink({
	className,
	asChild = false,
	...props
}: BreadcrumbLinkProps) {
	return (
		<Link
			data-slot="breadcrumb-link"
			className={cn(
				"text-base-content/70 transition-colors hover:text-base-content",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="breadcrumb-page"
			role="link"
			aria-disabled="true"
			aria-current="page"
			className={cn("font-medium text-base-content", className)}
			{...props}
		/>
	);
}

function BreadcrumbSeparator({
	className,
	children,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn("text-base-content/50", className)}
			{...props}
		>
			{children ?? <ChevronRight className="h-4 w-4" />}
		</span>
	);
}

export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
};
