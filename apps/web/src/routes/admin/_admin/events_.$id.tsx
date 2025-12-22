import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getEvent } from "@/functions/get-event";
import { createEventDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/events_/$id")({
	loader: ({ params }) => getEvent(params.id),
	head: ({ loaderData }) => createEventDetailHead(loaderData?.name),
	component: EventDetailPage,
});

function EventDetailPage() {
	const event = Route.useLoaderData();

	// エラー・未存在
	if (!event) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>イベントが見つかりません</span>
				</div>
				<Link to="/admin/events" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					イベント一覧に戻る
				</Link>
			</div>
		);
	}

	// 開催日を日付順でソート
	const sortedDays = [...event.days].sort((a, b) => a.dayNumber - b.dayNumber);

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="イベント詳細"
				breadcrumbs={[
					{ label: "イベント", href: "/admin/events" },
					{ label: event.name },
				]}
			/>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{event.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">イベントシリーズ</Label>
							<p>
								{event.seriesName ? (
									<Link
										to="/admin/event-series/$id"
										params={{ id: event.eventSeriesId }}
										className="text-primary hover:underline"
									>
										{event.seriesName}
									</Link>
								) : (
									"-"
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">回次</Label>
							<p>{event.edition != null ? `第${event.edition}回` : "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">開催日数</Label>
							<p>{event.totalDays != null ? `${event.totalDays}日間` : "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">開始日</Label>
							<p>
								{event.startDate
									? format(new Date(event.startDate), "yyyy年M月d日", {
											locale: ja,
										})
									: "-"}
							</p>
						</div>
						<div>
							<Label className="text-base-content/60">終了日</Label>
							<p>
								{event.endDate
									? format(new Date(event.endDate), "yyyy年M月d日", {
											locale: ja,
										})
									: "-"}
							</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">会場</Label>
							<p>{event.venue || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 開催日一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">開催日一覧</h2>

					{sortedDays.length === 0 ? (
						<p className="text-base-content/60">開催日が登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[100px]">日目</TableHead>
										<TableHead>日付</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedDays.map((day) => (
										<TableRow key={day.id}>
											<TableCell className="font-medium">
												{day.dayNumber}日目
											</TableCell>
											<TableCell>
												{format(new Date(day.date), "yyyy年M月d日（E）", {
													locale: ja,
												})}
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
