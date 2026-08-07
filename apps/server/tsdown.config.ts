import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	deps: {
		// Workspace packages are bundled so the Docker runner only needs dist.
		alwaysBundle: [/^@thac\//],
		// Better Auth loads OpenTelemetry dynamically and falls back when absent.
		neverBundle: ["@opentelemetry/api"],
		// Bundling the remaining runtime graph is intentional for the standalone output.
		onlyBundle: false,
	},
});
