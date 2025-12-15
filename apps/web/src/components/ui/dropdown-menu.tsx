import type * as React from "react";

import { cn } from "@/lib/utils";

interface DropdownMenuProps {
	children: React.ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
	return (
		<div data-slot="dropdown-menu" className="dropdown">
			{children}
		</div>
	);
}

function DropdownMenuTrigger({
	className,
	children,
	asChild = false,
	...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
	return (
		<div
			data-slot="dropdown-menu-trigger"
			role="button"
			tabIndex={0}
			className={cn("cursor-pointer", className)}
			{...props}
		>
			{children}
		</div>
	);
}

function DropdownMenuContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="dropdown-menu-content"
			role="menu"
			className={cn(
				"dropdown-content menu z-50 w-52 rounded-box bg-base-100 p-2 shadow-lg",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuItem({
	className,
	inset,
	...props
}: React.ComponentProps<"li"> & { inset?: boolean }) {
	return (
		<li
			data-slot="dropdown-menu-item"
			data-inset={inset}
			className={cn(inset && "pl-8", className)}
			{...props}
		/>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<"li"> & { inset?: boolean }) {
	return (
		<li
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				"menu-title px-2 py-1.5 font-medium text-sm",
				inset && "pl-8",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="dropdown-menu-separator"
			className={cn("my-1 border-base-300 border-b", className)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
};
