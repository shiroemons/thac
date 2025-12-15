import type * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.ComponentProps<"table"> {
	zebra?: boolean;
}

function Table({ className, zebra = false, ...props }: TableProps) {
	return (
		<div data-slot="table-container" className="w-full overflow-x-auto">
			<table
				data-slot="table"
				className={cn("table", zebra && "table-zebra", className)}
				{...props}
			/>
		</div>
	);
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
	return (
		<thead
			data-slot="table-header"
			className={cn("bg-base-200", className)}
			{...props}
		/>
	);
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot data-slot="table-footer" className={cn(className)} {...props} />
	);
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr data-slot="table-row" className={cn("hover", className)} {...props} />
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			className={cn("font-semibold text-base-content", className)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return <td data-slot="table-cell" className={cn(className)} {...props} />;
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("mt-4 text-sm", className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
};
