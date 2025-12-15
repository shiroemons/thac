import type * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
	onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
	className,
	onCheckedChange,
	onChange,
	...props
}: CheckboxProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange?.(e);
		onCheckedChange?.(e.target.checked);
	};

	return (
		<input
			type="checkbox"
			data-slot="checkbox"
			className={cn("checkbox", className)}
			onChange={handleChange}
			{...props}
		/>
	);
}

export { Checkbox };
export type { CheckboxProps };
