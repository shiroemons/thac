import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn("textarea textarea-bordered w-full", className)}
			{...props}
		/>
	);
}

export { Textarea };
