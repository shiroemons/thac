import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	// TODO: `noExternal` is deprecated in tsdown 0.21+. Migrate to `deps.alwaysBundle`.
	noExternal: [/@thac\/.*/],
});
