import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-base-200">
			<div className="text-center">
				<ShieldX className="mx-auto h-16 w-16 text-error" />
				<h1 className="mt-4 font-bold text-4xl">403 Forbidden</h1>
				<p className="mt-2 text-base-content/70">
					このページにアクセスする権限がありません。
				</p>
			</div>
		</div>
	);
}
