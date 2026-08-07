import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), tanstackStart(), viteReact()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
		// daisyui の "browser" フィールドが daisyui.css を返すことで
		// Vite v8 (Rolldown) の loaderHookWorker が .css を ESM としてロードしようとしてエラーになるため、
		// "browser" を mainFields から除外する（@tailwindcss/vite + Rolldown の互換性 workaround）
		mainFields: ["module", "jsnext:main", "jsnext"],
	},
	ssr: {
		// サーバー専用パッケージをSSRビルドで外部化し、クライアントバンドルへの漏洩を防止
		external: ["postgres", "@thac/db", "@thac/auth"],
	},
});
