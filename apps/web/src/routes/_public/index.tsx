import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div>
			<h1 className="font-bold text-3xl">トップページ</h1>
			<p className="mt-2 text-base-content/70">Phase 3で実装予定</p>
		</div>
	);
}
