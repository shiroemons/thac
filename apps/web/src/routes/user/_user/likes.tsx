import { createFileRoute, redirect } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userCollectionsListQueryOptions } from "@/lib/user-collections-query-options";

export const Route = createFileRoute("/user/_user/likes")({
	head: () => createPageHead("お気に入り"),
	headers: () => CACHE_HEADERS.PRIVATE,
	loader: async ({ context }) => {
		const list = await context.queryClient.ensureQueryData(
			userCollectionsListQueryOptions({ kind: "collection" }),
		);
		const liked = list.items.find((c) => c.isDefaultLiked);
		if (liked) {
			throw redirect({
				to: "/user/collections/$id",
				params: { id: liked.id },
			});
		}
		return {};
	},
	component: LikesEmptyPage,
});

function LikesEmptyPage() {
	return (
		<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
			<Heart
				className="mx-auto mb-4 size-10 text-base-content/30"
				strokeWidth={1.5}
			/>
			<h1 className="font-bold text-xl">お気に入り</h1>
			<p className="mt-2 text-base-content/60">
				楽曲・アルバム・サークルの詳細ページにある♥ボタンを押すと、ここに自動で集まります。
			</p>
		</div>
	);
}
