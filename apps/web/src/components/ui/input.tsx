import type * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
	error?: boolean;
	errorId?: string;
}

function Input({ className, type, error, errorId, ...props }: InputProps) {
	return (
		<input
			type={type}
			data-slot="input"
			aria-invalid={error || undefined}
			aria-describedby={errorId || undefined}
			className={cn(
				"input input-bordered w-full",
				error && "input-error",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
