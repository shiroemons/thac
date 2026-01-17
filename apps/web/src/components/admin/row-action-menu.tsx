import { Link } from "@tanstack/react-router";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RowAction {
	label: string;
	icon: ReactNode;
	onClick: () => void;
	variant?: "default" | "danger";
	href?: string;
	linkParams?: Record<string, string>;
}

interface RowActionMenuProps {
	actions: RowAction[];
	className?: string;
}

export function RowActionMenu({ actions, className }: RowActionMenuProps) {
	return (
		<div className={cn("flex items-center", className)}>
			{/* Desktop actions */}
			<div className="hidden items-center gap-1 md:flex">
				{actions.map((action) => {
					const buttonClassName = cn(
						action.variant === "danger" && "text-error hover:text-error",
					);

					if (action.href) {
						return (
							<Link
								key={action.label}
								to={action.href}
								params={action.linkParams}
								className={cn(
									"btn btn-ghost btn-square btn-sm focus-ring",
									buttonClassName,
								)}
							>
								{action.icon}
								<span className="sr-only">{action.label}</span>
							</Link>
						);
					}

					return (
						<Button
							key={action.label}
							variant="ghost"
							size="icon"
							className={buttonClassName}
							onClick={action.onClick}
						>
							{action.icon}
							<span className="sr-only">{action.label}</span>
						</Button>
					);
				})}
			</div>

			{/* Mobile dropdown */}
			<div className="dropdown dropdown-end md:hidden">
				<button className="btn btn-ghost btn-square btn-sm" type="button">
					<MoreHorizontal className="h-4 w-4" />
					<span className="sr-only">メニュー</span>
				</button>
				<ul className="menu dropdown-content z-[1] w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
					{actions.map((action) => {
						const itemClassName = cn(
							action.variant === "danger" && "text-error",
						);

						if (action.href) {
							return (
								<li key={action.label}>
									<Link
										to={action.href}
										params={action.linkParams}
										className={itemClassName}
									>
										{action.icon}
										{action.label}
									</Link>
								</li>
							);
						}

						return (
							<li key={action.label}>
								<button
									type="button"
									className={itemClassName}
									onClick={action.onClick}
								>
									{action.icon}
									{action.label}
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

interface AdminRowActionsProps {
	onView?: () => void;
	viewHref?: string;
	viewParams?: Record<string, string>;
	onEdit: () => void;
	onDelete: () => void;
	className?: string;
}

export function AdminRowActions({
	onView,
	viewHref,
	viewParams,
	onEdit,
	onDelete,
	className,
}: AdminRowActionsProps) {
	const actions: RowAction[] = [];

	if (onView || viewHref) {
		actions.push({
			label: "詳細",
			icon: <Eye className="h-4 w-4" />,
			onClick: onView || (() => {}),
			href: viewHref,
			linkParams: viewParams,
		});
	}

	actions.push(
		{
			label: "編集",
			icon: <Pencil className="h-4 w-4" />,
			onClick: onEdit,
		},
		{
			label: "削除",
			icon: <Trash2 className="h-4 w-4" />,
			onClick: onDelete,
			variant: "danger",
		},
	);

	return <RowActionMenu actions={actions} className={className} />;
}
