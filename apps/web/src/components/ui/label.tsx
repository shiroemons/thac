import type * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		<label
			data-slot="label"
			className={cn("label font-medium text-sm", className)}
			{...props}
		/>
	);
}

export { Label };
