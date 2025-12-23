import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { createEventSeriesDetailHead } from "@/lib/head";
import { eventSeriesDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/event-series_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			eventSeriesDetailQueryOptions(params.id),
		),
	head: ({ loaderData }) => createEventSeriesDetailHead(loaderData?.name),
	component: EventSeriesDetailPage,
});

function EventSeriesDetailPage() {
	const { id } = Route.useParams();
	const { data: series, isPending } = useQuery(
		eventSeriesDetailQueryOptions(id),
	);

	// ローディング
	if (isPending && !series) {
		return <DetailPageSkeleton cardCount={2} fieldsPerCard={7} />;
	}

	// エラー・未存在
	if (!series) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>イベントシリーズが見つかりません</span>
				</div>
				<Link to="/admin/event-series" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					イベントシリーズ一覧に戻る
				</Link>
			</div>
		);
	}

	// イベントを回次順でソート
	const sortedEvents = [...series.events].sort((a, b) => {
		if (a.edition == null && b.edition == null) return 0;
		if (a.edition == null) return 1;
		if (b.edition == null) return -1;
		return a.edition - b.edition;
	});

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="イベントシリーズ詳細"
				breadcrumbs={[
					{ label: "イベントシリーズ", href: "/admin/event-series" },
					{ label: series.name },
				]}
			/>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{series.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{series.sortOrder ?? "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 所属イベント一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">所属イベント一覧</h2>

					{sortedEvents.length === 0 ? (
						<p className="text-base-content/60">イベントが登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[100px]">回次</TableHead>
										<TableHead>名前</TableHead>
										<TableHead className="w-[150px]">開始日</TableHead>
										<TableHead className="w-[150px]">終了日</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedEvents.map((event) => (
										<TableRow key={event.id}>
											<TableCell className="font-medium">
												{event.edition != null ? `第${event.edition}回` : "-"}
											</TableCell>
											<TableCell>
												<Link
													to="/admin/events/$id"
													params={{ id: event.id }}
													className="text-primary hover:underline"
												>
													{event.name}
												</Link>
											</TableCell>
											<TableCell>
												{event.startDate
													? format(new Date(event.startDate), "yyyy/M/d", {
															locale: ja,
														})
													: "-"}
											</TableCell>
											<TableCell>
												{event.endDate
													? format(new Date(event.endDate), "yyyy/M/d", {
															locale: ja,
														})
													: "-"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
