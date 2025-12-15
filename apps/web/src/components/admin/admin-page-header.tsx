import { Home } from "lucide-react";
import type * as React from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface BreadcrumbItemData {
	label: string;
	href?: string;
}

interface AdminPageHeaderProps extends React.ComponentProps<"div"> {
	title: string;
	description?: string;
	breadcrumbs?: BreadcrumbItemData[];
}

function AdminPageHeader({
	title,
	description,
	breadcrumbs,
	className,
	children,
	...props
}: AdminPageHeaderProps) {
	const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

	return (
		<div
			data-slot="admin-page-header"
			className={cn("mb-6 space-y-2", className)}
			{...props}
		>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">{title}</h1>
					{description && (
						<p className="text-base-content/70 text-sm">{description}</p>
					)}
				</div>
				<div className="flex items-center gap-4">
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								{hasBreadcrumbs ? (
									<BreadcrumbLink to="/admin">
										<Home className="h-4 w-4" />
									</BreadcrumbLink>
								) : (
									<BreadcrumbPage>
										<Home className="h-4 w-4" />
									</BreadcrumbPage>
								)}
							</BreadcrumbItem>
							{hasBreadcrumbs &&
								breadcrumbs.map((item) => (
									<BreadcrumbItem key={item.label}>
										<BreadcrumbSeparator />
										{item.href ? (
											<BreadcrumbLink to={item.href}>
												{item.label}
											</BreadcrumbLink>
										) : (
											<BreadcrumbPage>{item.label}</BreadcrumbPage>
										)}
									</BreadcrumbItem>
								))}
						</BreadcrumbList>
					</Breadcrumb>
					{children && (
						<div className="flex items-center gap-2">{children}</div>
					)}
				</div>
			</div>
		</div>
	);
}

export { AdminPageHeader };
export type { AdminPageHeaderProps, BreadcrumbItemData };
