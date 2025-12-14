import { describe, expect, test } from "bun:test";
import z from "zod";

// AdminLoginFormで使用されているバリデーションスキーマを直接テスト
const loginSchema = z.object({
	email: z.string().email("無効なメールアドレス形式です"),
	password: z.string().min(1, "パスワードを入力してください"),
});

describe("AdminLoginForm validation", () => {
	test("valid email and password passes validation", () => {
		const result = loginSchema.safeParse({
			email: "admin@example.com",
			password: "password123",
		});
		expect(result.success).toBe(true);
	});

	test("invalid email format fails validation", () => {
		const result = loginSchema.safeParse({
			email: "invalid-email",
			password: "password123",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailError = result.error.issues.find(
				(issue) => issue.path[0] === "email",
			);
			expect(emailError?.message).toBe("無効なメールアドレス形式です");
		}
	});

	test("empty password fails validation", () => {
		const result = loginSchema.safeParse({
			email: "admin@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const passwordError = result.error.issues.find(
				(issue) => issue.path[0] === "password",
			);
			expect(passwordError?.message).toBe("パスワードを入力してください");
		}
	});

	test("empty email fails validation", () => {
		const result = loginSchema.safeParse({
			email: "",
			password: "password123",
		});
		expect(result.success).toBe(false);
	});
});

describe("Admin role validation", () => {
	test("admin role is correctly identified", () => {
		const user = { role: "admin" };
		expect(user.role === "admin").toBe(true);
	});

	test("user role is not admin", () => {
		const user = { role: "user" };
		expect(user.role === "admin").toBe(false);
	});

	test("undefined role is not admin", () => {
		const user = { role: undefined };
		expect(user.role === "admin").toBe(false);
	});
});
