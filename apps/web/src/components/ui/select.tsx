import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

type SelectSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<SelectSize, string> = {
	xs: "select-xs",
	sm: "select-sm",
	md: "",
	lg: "select-lg",
};

interface SelectProps extends Omit<React.ComponentProps<"select">, "size"> {
	size?: SelectSize;
}

function Select({ className, size = "md", children, ...props }: SelectProps) {
	return (
		<select
			data-slot="select"
			className={cn("select select-bordered", sizeClasses[size], className)}
			{...props}
		>
			{children}
		</select>
	);
}

interface SelectTriggerProps extends React.ComponentProps<"button"> {
	size?: SelectSize;
	placeholder?: string;
}

function SelectTrigger({
	className,
	size = "md",
	placeholder,
	children,
	...props
}: SelectTriggerProps) {
	return (
		<button
			type="button"
			data-slot="select-trigger"
			className={cn(
				"btn btn-ghost gap-2 border border-base-300 bg-base-100 font-normal",
				sizeClasses[size],
				className,
			)}
			{...props}
		>
			{children ?? placeholder}
			<ChevronDown className="h-4 w-4 opacity-50" />
		</button>
	);
}

export { Select, SelectTrigger };
export type { SelectProps, SelectSize };
