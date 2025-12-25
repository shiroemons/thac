import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type EventSeries, eventSeriesApi } from "@/lib/api-client";
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
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<Partial<EventSeries>>({});
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { data: series, isPending } = useQuery(
		eventSeriesDetailQueryOptions(id),
	);

	const handleEdit = () => {
		if (!series) return;
		setEditForm({
			name: series.name,
		});
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async () => {
		if (!series) return;
		setIsSubmitting(true);
		setError(null);
		try {
			await eventSeriesApi.update(id, {
				name: editForm.name,
			});
			setIsEditDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!series) return;
		if (
			!confirm(
				`「${series.name}」を削除しますか？\n\n※ イベントが紐付いている場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await eventSeriesApi.delete(id);
			queryClient.invalidateQueries({ queryKey: ["eventSeries"] });
			navigate({ to: "/admin/event-series" });
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "削除に失敗しました。イベントが紐付いている可能性があります。",
			);
			setIsDeleting(false);
		}
	};

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
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>
						<Link to="/admin/event-series">イベントシリーズ管理</Link>
					</li>
					<li>{series.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/event-series" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{series.name}</h1>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleEdit}>
						<Pencil className="mr-2 h-4 w-4" />
						編集
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-error hover:text-error"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						{isDeleting ? "削除中..." : "削除"}
					</Button>
				</div>
			</div>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

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

			{/* 編集ダイアログ */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>イベントシリーズの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: 博麗神社例大祭"
							/>
						</div>
					</div>
					{error && <div className="mb-4 text-error text-sm">{error}</div>}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleUpdate} disabled={isSubmitting}>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
