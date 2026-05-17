import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: [
			"apps/**/*.{test,spec}.{ts,tsx}",
			"packages/**/*.{test,spec}.{ts,tsx}",
		],
		environment: "node",
		environmentMatchGlobs: [
			["apps/web/**/*.{test,spec}.{ts,tsx}", "happy-dom"],
		],
		setupFiles: ["./apps/web/happydom.ts"],
		coverage: {
			provider: "v8",
			reportsDirectory: "coverage",
		},
	},
});
