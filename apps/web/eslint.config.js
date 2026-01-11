import tsParser from "@typescript-eslint/parser";
import reactCompiler from "eslint-plugin-react-compiler";
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
			"react-compiler": reactCompiler,
		},
		rules: {
			"validate-jsx-nesting/no-invalid-jsx-nesting": "error",
			"react-compiler/react-compiler": "error",
		},
	},
];
