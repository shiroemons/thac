import { Loader2, Search } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

type SearchInputSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<SearchInputSize, string> = {
	xs: "input-xs",
	sm: "input-sm",
	md: "",
	lg: "input-lg",
};

const iconSizeClasses: Record<SearchInputSize, string> = {
	xs: "h-3 w-3",
	sm: "h-4 w-4",
	md: "h-4 w-4",
	lg: "h-5 w-5",
};

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "size"> {
	size?: SearchInputSize;
	containerClassName?: string;
	isLoading?: boolean;
}

function SearchInput({
	className,
	size = "md",
	containerClassName,
	isLoading = false,
	...props
}: SearchInputProps) {
	const IconComponent = isLoading ? Loader2 : Search;

	return (
		<div
			data-slot="search-input-container"
			className={cn("relative", containerClassName)}
		>
			<IconComponent
				className={cn(
					"pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-base-content/50",
					iconSizeClasses[size],
					isLoading && "animate-spin",
				)}
			/>
			<input
				type="search"
				data-slot="search-input"
				className={cn(
					"input input-bordered w-full pl-10",
					sizeClasses[size],
					className,
				)}
				autoComplete="off"
				{...props}
			/>
		</div>
	);
}

export { SearchInput };
export type { SearchInputProps, SearchInputSize };
