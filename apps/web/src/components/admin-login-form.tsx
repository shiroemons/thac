import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function AdminLoginForm() {
	const navigate = useNavigate({
		from: "/admin/login",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: async () => {
						// 認証成功後、セッションからロールを確認
						const session = await authClient.getSession();
						if (session.data?.user?.role !== "admin") {
							// 管理者権限がない場合はサインアウトしてエラー表示
							await authClient.signOut();
							toast.error("管理者権限がありません");
							return;
						}
						navigate({
							to: "/admin",
						});
						toast.success("ログインしました");
					},
					onError: (error) => {
						// タイミング攻撃対策: 統一されたエラーメッセージ
						toast.error(
							error.error.message ||
								"メールアドレスまたはパスワードが正しくありません",
						);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.string().email("無効なメールアドレス形式です"),
				password: z.string().min(1, "パスワードを入力してください"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">管理者ログイン</h1>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<>
							<div>
								<form.Field name="email">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>メールアドレス</Label>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												disabled={isSubmitting}
											/>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							<div>
								<form.Field name="password">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>パスワード</Label>
											<Input
												id={field.name}
												name={field.name}
												type="password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												disabled={isSubmitting}
											/>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>
						</>
					)}
				</form.Subscribe>

				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.values.email,
						state.values.password,
					]}
				>
					{([canSubmit, isSubmitting, email, password]) => {
						const isEmpty = !email || !password;
						return (
							<Button
								type="submit"
								className="w-full"
								disabled={isEmpty || !canSubmit || isSubmitting}
							>
								{isSubmitting ? "ログイン中..." : "ログイン"}
							</Button>
						);
					}}
				</form.Subscribe>
			</form>
		</div>
	);
}
