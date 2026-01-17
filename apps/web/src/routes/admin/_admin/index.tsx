import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	CircleUser,
	Disc,
	Disc3,
	FolderOpen,
	Home,
	Layers,
	MonitorSmartphone,
	Music,
	UserCog,
	UserPen,
	Users,
} from "lucide-react";
import { statsApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/")({
	head: () => createPageHead("管理ダッシュボード"),
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
		<div className="flex items-center gap-4 p-4">
			<div className="text-base-content/50">{icon}</div>
			<div>
				{isLoading ? (
					<div className="skeleton h-6 w-12" />
				) : (
					<div className="font-bold text-2xl leading-tight">
						{value?.toLocaleString()}
					</div>
				)}
				<div className="text-base-content/70 text-sm">{title}</div>
			</div>
		</div>
	);

	if (href) {
		return (
			<Link
				to={href}
				className="rounded-lg border border-base-300 bg-base-100 transition-colors hover:bg-base-200"
			>
				{content}
			</Link>
		);
	}

	return (
		<div className="rounded-lg border border-base-300 bg-base-100">
			{content}
		</div>
	);
}

function AdminDashboard() {
	const { data, isPending: isLoading } = useQuery({
		queryKey: ["admin-stats"],
		queryFn: statsApi.get,
		staleTime: 60_000,
	});

	const officialStats = [
		{
			title: "公式作品",
			value: data?.officialWorks,
			icon: <Disc className="h-4 w-4" />,
			href: "/admin/official/works" as const,
		},
		{
			title: "公式楽曲",
			value: data?.officialSongs,
			icon: <Music className="h-4 w-4" />,
			href: "/admin/official/songs" as const,
		},
	];

	const artistCircleStats = [
		{
			title: "アーティスト",
			value: data?.artists,
			icon: <UserPen className="h-4 w-4" />,
			href: "/admin/artists" as const,
		},
		{
			title: "アーティスト名義",
			value: data?.artistAliases,
			icon: <Users className="h-4 w-4" />,
			href: "/admin/artist-aliases" as const,
		},
		{
			title: "サークル",
			value: data?.circles,
			icon: <CircleUser className="h-4 w-4" />,
			href: "/admin/circles" as const,
		},
	];

	const eventStats = [
		{
			title: "イベントシリーズ",
			value: data?.eventSeries,
			icon: <Layers className="h-4 w-4" />,
			href: "/admin/event-series" as const,
		},
		{
			title: "イベント",
			value: data?.events,
			icon: <Calendar className="h-4 w-4" />,
			href: "/admin/events" as const,
		},
	];

	const releaseStats = [
		{
			title: "作品",
			value: data?.releases,
			icon: <Disc3 className="h-4 w-4" />,
			href: "/admin/releases" as const,
		},
		{
			title: "トラック",
			value: data?.tracks,
			icon: <Music className="h-4 w-4" />,
			href: "/admin/tracks" as const,
		},
	];

	const masterStats = [
		{
			title: "プラットフォーム",
			value: data?.platforms,
			icon: <MonitorSmartphone className="h-4 w-4" />,
			href: "/admin/master/platforms" as const,
		},
		{
			title: "名義種別",
			value: data?.aliasTypes,
			icon: <Users className="h-4 w-4" />,
			href: "/admin/master/alias-types" as const,
		},
		{
			title: "クレジット役割",
			value: data?.creditRoles,
			icon: <UserCog className="h-4 w-4" />,
			href: "/admin/master/credit-roles" as const,
		},
		{
			title: "公式作品カテゴリ",
			value: data?.officialWorkCategories,
			icon: <FolderOpen className="h-4 w-4" />,
			href: "/admin/master/official-work-categories" as const,
		},
	];

	return (
		<div className="container mx-auto space-y-4 p-4">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>ダッシュボード</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-xl">ダッシュボード</h1>

			<div className="space-y-4">
				{/* ユーザー */}
				<section>
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						ユーザー
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
						<StatCard
							title="ユーザー"
							value={data?.users}
							icon={<Users className="h-4 w-4" />}
							isLoading={isLoading}
						/>
					</div>
				</section>

				{/* マスタ管理 */}
				<section>
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						マスタ管理
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						公式管理
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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

				{/* アーティスト・サークル */}
				<section>
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						アーティスト・サークル
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
						{artistCircleStats.map((stat) => (
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

				{/* イベント管理 */}
				<section>
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						イベント管理
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
						{eventStats.map((stat) => (
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

				{/* 作品管理 */}
				<section>
					<h2 className="mb-2 font-medium text-base text-base-content/80">
						作品管理
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
						{releaseStats.map((stat) => (
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
