import tsParser from "@typescript-eslint/parser";
import validateJsxNesting from "eslint-plugin-validate-jsx-nesting";

export default [
	{
		files: ["src/**/*.{tsx,jsx}"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			"validate-jsx-nesting": validateJsxNesting,
		},
		rules: {
			"validate-jsx-nesting/no-invalid-jsx-nesting": "error",
		},
	},
];
