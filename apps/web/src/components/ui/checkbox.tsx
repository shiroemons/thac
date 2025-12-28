import type * as React from "react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
	onCheckedChange?: (checked: boolean) => void;
	indeterminate?: boolean;
}

function Checkbox({
	className,
	onCheckedChange,
	onChange,
	indeterminate = false,
	...props
}: CheckboxProps) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange?.(e);
		onCheckedChange?.(e.target.checked);
	};

	return (
		<input
			ref={ref}
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
