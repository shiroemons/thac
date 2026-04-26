import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { AlbumRequestForm } from "@/components/album-request-form";
import { PublicHeader } from "@/components/public/public-header";
import { Banner } from "@/components/ui/banner";
import { getUser } from "@/functions/get-user";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userAlbumRequestMutations } from "@/lib/mutation-options";

export const Route = createFileRoute("/user/album-requests/new")({
	head: () => createPageHead("アルバム情報の提供"),
	headers: () => CACHE_HEADERS.PRIVATE,
	beforeLoad: async () => {
		const session = await getUser();

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { returnTo: "/user/album-requests/new" },
			});
		}

		return { user: session.user };
	},
	component: AlbumRequestNewPage,
});

function AlbumRequestNewPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState(false);

	const { mutateAsync, isPending } = useMutation(
		userAlbumRequestMutations.submit(queryClient),
	);

	const handleSubmit = async (payload: Parameters<typeof mutateAsync>[0]) => {
		setSubmitError(null);
		try {
			await mutateAsync(payload);
			setSubmitSuccess(true);
			setTimeout(() => {
				navigate({ to: "/user/album-requests" });
			}, 1500);
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "送信に失敗しました",
			);
		}
	};

	return (
		<div className="flex min-h-screen flex-col">
			<PublicHeader />
			<main className="flex-1 bg-base-200/30">
				<div className="mx-auto max-w-2xl px-4 py-8">
					<div className="mb-2">
						<Link
							to="/user/album-requests"
							className="text-base-content/60 text-sm hover:text-base-content"
						>
							← 提供リクエスト一覧へ
						</Link>
					</div>
					<div className="mb-6">
						<h1 className="font-bold text-2xl">アルバム情報の提供</h1>
						<p className="mt-2 text-base-content/70">
							新しいアルバムの登録を依頼するか、既存アルバムへの情報追記を提案できます。
						</p>
					</div>

					{submitSuccess && (
						<Banner variant="success" className="mb-4">
							申請を送信しました。承認をお待ちください。
						</Banner>
					)}

					{submitError && (
						<Banner
							variant="error"
							onDismiss={() => setSubmitError(null)}
							className="mb-4"
						>
							{submitError}
						</Banner>
					)}

					<div className="rounded-box bg-base-100 p-6 shadow">
						<AlbumRequestForm
							onSubmit={handleSubmit}
							isSubmitting={isPending}
						/>
					</div>
				</div>
			</main>
			<footer className="bg-base-200 py-6 text-center text-base-content/60 text-sm">
				<p>
					&copy; {new Date().getFullYear()} 迷い家の白猫. All rights reserved.
				</p>
			</footer>
		</div>
	);
}
