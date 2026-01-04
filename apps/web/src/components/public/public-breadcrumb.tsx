import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItemData {
	label: string;
	href?: string;
}

interface PublicBreadcrumbProps {
	items: BreadcrumbItemData[];
}

export function PublicBreadcrumb({ items }: PublicBreadcrumbProps) {
	// ホームを先頭に追加
	const allItems: BreadcrumbItemData[] = [
		{ label: "ホーム", href: "/" },
		...items,
	];

	return (
		<Breadcrumb className="mb-4">
			<BreadcrumbList>
				{allItems.map((item, index) => {
					const isLast = index === allItems.length - 1;

					return (
						<BreadcrumbItem key={`${item.label}-${index}`}>
							{index > 0 && <BreadcrumbSeparator />}
							{isLast || !item.href ? (
								<BreadcrumbPage>{item.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink to={item.href}>{item.label}</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
