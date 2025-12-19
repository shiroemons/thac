import { EllipsisVertical, Plus } from "lucide-react";
import type * as React from "react";
import { ColumnVisibilityToggle } from "@/components/admin/column-visibility-toggle";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import type { ColumnConfig } from "@/hooks/use-column-visibility";
import { cn } from "@/lib/utils";

interface FilterOption {
	value: string;
	label: string;
}

interface SecondaryAction {
	label: string;
	icon?: React.ReactNode;
	onClick: () => void;
}

interface ColumnVisibilityConfig {
	columns: ColumnConfig[];
	visibleColumns: Set<string>;
	onToggle: (key: string) => void;
}

interface DataTableActionBarProps extends React.ComponentProps<"div"> {
	searchPlaceholder?: string;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	filterOptions?: FilterOption[];
	filterValue?: string;
	filterPlaceholder?: string;
	onFilterChange?: (value: string) => void;
	primaryAction?: {
		label: string;
		onClick: () => void;
	};
	secondaryActions?: SecondaryAction[];
	columnVisibility?: ColumnVisibilityConfig;
}

function DataTableActionBar({
	searchPlaceholder = "検索...",
	searchValue,
	onSearchChange,
	filterOptions,
	filterValue,
	filterPlaceholder = "すべて",
	onFilterChange,
	primaryAction,
	secondaryActions,
	columnVisibility,
	className,
	children,
	...props
}: DataTableActionBarProps) {
	return (
		<div
			data-slot="data-table-action-bar"
			className={cn(
				"mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
			{...props}
		>
			<div className="flex flex-1 items-center gap-3">
				{onSearchChange && (
					<SearchInput
						placeholder={searchPlaceholder}
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						size="md"
						containerClassName="w-64"
					/>
				)}
				{filterOptions && filterOptions.length > 0 && onFilterChange && (
					<Select
						size="md"
						value={filterValue}
						onChange={(e) => onFilterChange(e.target.value)}
						className="w-44"
					>
						<option value="">{filterPlaceholder}</option>
						{filterOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				)}
				{children}
			</div>
			<div className="flex items-center gap-2">
				{columnVisibility && (
					<ColumnVisibilityToggle
						columns={columnVisibility.columns}
						visibleColumns={columnVisibility.visibleColumns}
						onToggle={columnVisibility.onToggle}
					/>
				)}
				{primaryAction && (
					<Button
						variant="primary"
						size="md"
						onClick={primaryAction.onClick}
						className="gap-1"
					>
						<Plus className="h-4 w-4" />
						{primaryAction.label}
					</Button>
				)}
				{secondaryActions && secondaryActions.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="md">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{secondaryActions.map((action) => (
								<DropdownMenuItem key={action.label} onClick={action.onClick}>
									{action.icon}
									{action.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}

export { DataTableActionBar };
export type {
	ColumnVisibilityConfig,
	DataTableActionBarProps,
	FilterOption,
	SecondaryAction,
};
