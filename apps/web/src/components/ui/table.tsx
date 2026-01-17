import type * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.ComponentProps<"table"> {
	zebra?: boolean;
}

interface TableHeadProps extends React.ComponentProps<"th"> {
	sticky?: "left" | "right";
	sortable?: boolean;
	sorted?: "asc" | "desc" | false;
}

interface TableCellProps extends React.ComponentProps<"td"> {
	sticky?: "left" | "right";
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

function TableHead({
	className,
	sticky,
	sortable,
	sorted,
	...props
}: TableHeadProps) {
	const ariaSort =
		sorted === "asc"
			? "ascending"
			: sorted === "desc"
				? "descending"
				: sorted === false
					? "none"
					: undefined;

	return (
		<th
			data-slot="table-head"
			scope="col"
			aria-sort={ariaSort}
			className={cn(
				"font-semibold text-base-content",
				sticky === "left" &&
					"sticky left-0 bg-base-100 shadow-[2px_0_4px_rgba(0,0,0,0.1)]",
				sticky === "right" &&
					"sticky right-0 bg-base-100 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, sticky, ...props }: TableCellProps) {
	return (
		<td
			data-slot="table-cell"
			className={cn(
				sticky === "left" &&
					"sticky left-0 bg-base-100 shadow-[2px_0_4px_rgba(0,0,0,0.1)]",
				sticky === "right" &&
					"sticky right-0 bg-base-100 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]",
				className,
			)}
			{...props}
		/>
	);
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
