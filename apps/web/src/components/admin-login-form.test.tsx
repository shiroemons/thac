import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

// モック: @tanstack/react-router
mock.module("@tanstack/react-router", () => ({
	useNavigate: () => mock(() => {}),
}));

// モック: sonner
mock.module("sonner", () => ({
	toast: {
		success: mock(() => {}),
		error: mock(() => {}),
	},
}));

// モック: auth-client
mock.module("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({ isPending: false, data: null }),
		signIn: {
			email: mock(() => Promise.resolve()),
		},
		getSession: mock(() => Promise.resolve({ data: null })),
		signOut: mock(() => Promise.resolve()),
	},
}));

// コンポーネントをモック後にインポート
import AdminLoginForm from "./admin-login-form";

afterEach(() => {
	cleanup();
});

describe("AdminLoginForm", () => {
	test("renders login form with email and password fields", () => {
		render(<AdminLoginForm />);

		expect(screen.getByText("管理者ログイン")).toBeDefined();
		expect(screen.getByLabelText("メールアドレス")).toBeDefined();
		expect(screen.getByLabelText("パスワード")).toBeDefined();
		expect(screen.getByRole("button", { name: "ログイン" })).toBeDefined();
	});

	test("submit button is disabled when fields are empty", () => {
		render(<AdminLoginForm />);

		const submitButton = screen.getByRole("button", {
			name: "ログイン",
		}) as HTMLButtonElement;
		expect(submitButton.disabled).toBe(true);
	});

	test("displays email validation error for invalid format", async () => {
		render(<AdminLoginForm />);

		const emailInput = screen.getByLabelText("メールアドレス");
		const passwordInput = screen.getByLabelText("パスワード");
		const submitButton = screen.getByRole("button", { name: "ログイン" });

		// 無効なメールアドレスを入力
		emailInput.focus();
		await Bun.sleep(0);
		(emailInput as HTMLInputElement).value = "invalid-email";
		emailInput.dispatchEvent(new Event("input", { bubbles: true }));
		emailInput.dispatchEvent(new Event("change", { bubbles: true }));

		// パスワードを入力
		passwordInput.focus();
		await Bun.sleep(0);
		(passwordInput as HTMLInputElement).value = "password123";
		passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
		passwordInput.dispatchEvent(new Event("change", { bubbles: true }));

		await Bun.sleep(100);

		// フォームを送信
		submitButton.click();

		await Bun.sleep(100);

		// エラーメッセージが表示されることを確認
		const errorMessage = screen.queryByText("無効なメールアドレス形式です");
		expect(errorMessage).toBeDefined();
	});
});
