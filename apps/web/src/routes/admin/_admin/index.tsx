import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Disc,
	FolderOpen,
	MonitorSmartphone,
	Music,
	UserCog,
	Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { statsApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/")({
	component: AdminDashboard,
});

interface StatCardProps {
	title: string;
	value: number | undefined;
	icon: React.ReactNode;
	href?: string;
	isLoading: boolean;
}

function StatCard({ title, value, icon, href, isLoading }: StatCardProps) {
	const content = (
		<div className="card-body">
			<div className="flex items-center justify-between">
				<div className="text-base-content/60">{icon}</div>
				<div className="text-right">
					{isLoading ? (
						<div className="skeleton h-8 w-16" />
					) : (
						<div className="font-bold text-3xl">{value?.toLocaleString()}</div>
					)}
					<div className="text-base-content/60 text-sm">{title}</div>
				</div>
			</div>
		</div>
	);

	if (href) {
		return (
			<Link
				to={href}
				className="card border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md"
			>
				{content}
			</Link>
		);
	}

	return (
		<div className="card border border-base-300 bg-base-100 shadow-sm">
			{content}
		</div>
	);
}

function AdminDashboard() {
	const { data, isLoading } = useQuery({
		queryKey: ["admin-stats"],
		queryFn: statsApi.get,
		staleTime: 60_000,
	});

	const officialStats = [
		{
			title: "公式作品",
			value: data?.officialWorks,
			icon: <Disc className="h-8 w-8" />,
			href: "/admin/official/works" as const,
		},
		{
			title: "公式楽曲",
			value: data?.officialSongs,
			icon: <Music className="h-8 w-8" />,
			href: "/admin/official/songs" as const,
		},
	];

	const masterStats = [
		{
			title: "プラットフォーム",
			value: data?.platforms,
			icon: <MonitorSmartphone className="h-8 w-8" />,
			href: "/admin/master/platforms" as const,
		},
		{
			title: "別名義種別",
			value: data?.aliasTypes,
			icon: <Users className="h-8 w-8" />,
			href: "/admin/master/alias-types" as const,
		},
		{
			title: "クレジット役割",
			value: data?.creditRoles,
			icon: <UserCog className="h-8 w-8" />,
			href: "/admin/master/credit-roles" as const,
		},
		{
			title: "公式作品カテゴリ",
			value: data?.officialWorkCategories,
			icon: <FolderOpen className="h-8 w-8" />,
			href: "/admin/master/official-work-categories" as const,
		},
	];

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader title="ダッシュボード" />

			<div className="space-y-6">
				{/* ユーザー */}
				<section>
					<h2 className="mb-3 font-semibold text-lg">ユーザー</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatCard
							title="ユーザー"
							value={data?.users}
							icon={<Users className="h-8 w-8" />}
							isLoading={isLoading}
						/>
					</div>
				</section>

				{/* マスタ管理 */}
				<section>
					<h2 className="mb-3 font-semibold text-lg">マスタ管理</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{masterStats.map((stat) => (
							<StatCard
								key={stat.title}
								title={stat.title}
								value={stat.value}
								icon={stat.icon}
								href={stat.href}
								isLoading={isLoading}
							/>
						))}
					</div>
				</section>

				{/* 公式管理 */}
				<section>
					<h2 className="mb-3 font-semibold text-lg">公式管理</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{officialStats.map((stat) => (
							<StatCard
								key={stat.title}
								title={stat.title}
								value={stat.value}
								icon={stat.icon}
								href={stat.href}
								isLoading={isLoading}
							/>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
