import { Search } from "lucide-react";
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
}

function SearchInput({
	className,
	size = "md",
	containerClassName,
	...props
}: SearchInputProps) {
	return (
		<div
			data-slot="search-input-container"
			className={cn("relative", containerClassName)}
		>
			<Search
				className={cn(
					"-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 z-10 text-base-content/50",
					iconSizeClasses[size],
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
				{...props}
			/>
		</div>
	);
}

export { SearchInput };
export type { SearchInputProps, SearchInputSize };
