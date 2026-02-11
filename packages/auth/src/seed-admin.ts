import dotenv from "dotenv";

// 環境変数の読み込み（authモジュール初期化前に必要）
dotenv.config({
	path: "../../apps/server/.env",
});

// BETTER_AUTH_SECRET未設定時はdevbox開発用デフォルト値をセット
if (!process.env.BETTER_AUTH_SECRET) {
	process.env.BETTER_AUTH_SECRET = "devbox_secret_key_change_in_production";
}

async function seedAdmin() {
	// ESMのimportホイスティング対策: dotenv読み込み後にdynamic import
	const { auth } = await import("./index");
	const { cleanup } = await import("@thac/db");

	const email = process.env.ADMIN_EMAIL || "admin@example.com";
	const password = process.env.ADMIN_PASSWORD || "admin123456";
	const name = process.env.ADMIN_NAME || "Admin";

	console.log("Seeding admin user...");

	try {
		await auth.api.createUser({
			body: {
				email,
				password,
				name,
				role: "admin",
			},
		});
		console.log(`  ✓ Admin user created (${email})`);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("already exists")) {
			console.log("  ⊘ Admin user already exists (skipped)");
		} else {
			throw error;
		}
	}

	await cleanup();
}

seedAdmin()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error("Error seeding admin user:", error);
		process.exit(1);
	});
