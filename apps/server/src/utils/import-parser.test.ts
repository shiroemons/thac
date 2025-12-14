import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	detectFileType,
	parseAndValidate,
	parseCSV,
	parseJSON,
	validateRows,
} from "./import-parser";

describe("import-parser", () => {
	describe("parseCSV", () => {
		test("should parse simple CSV", () => {
			const csv = "code,name\nfoo,Foo\nbar,Bar";
			const result = parseCSV(csv);
			expect(result).toEqual([
				{ code: "foo", name: "Foo" },
				{ code: "bar", name: "Bar" },
			]);
		});

		test("should handle quoted fields", () => {
			const csv = 'code,name\n"foo,bar","Foo Bar"';
			const result = parseCSV(csv);
			expect(result).toEqual([{ code: "foo,bar", name: "Foo Bar" }]);
		});

		test("should handle escaped quotes", () => {
			const csv = 'code,name\nfoo,"Say ""Hello"""';
			const result = parseCSV(csv);
			expect(result).toEqual([{ code: "foo", name: 'Say "Hello"' }]);
		});

		test("should return empty array for header-only CSV", () => {
			const csv = "code,name";
			const result = parseCSV(csv);
			expect(result).toEqual([]);
		});

		test("should return empty array for empty CSV", () => {
			const csv = "";
			const result = parseCSV(csv);
			expect(result).toEqual([]);
		});

		test("should skip empty lines", () => {
			const csv = "code,name\nfoo,Foo\n\nbar,Bar";
			const result = parseCSV(csv);
			expect(result).toEqual([
				{ code: "foo", name: "Foo" },
				{ code: "bar", name: "Bar" },
			]);
		});

		test("should trim whitespace from values", () => {
			const csv = "code,name\n foo , Foo Bar ";
			const result = parseCSV(csv);
			expect(result).toEqual([{ code: "foo", name: "Foo Bar" }]);
		});
	});

	describe("parseJSON", () => {
		test("should parse JSON array", () => {
			const json = '[{"code":"foo","name":"Foo"}]';
			const result = parseJSON(json);
			expect(result).toEqual([{ code: "foo", name: "Foo" }]);
		});

		test("should throw for non-array JSON", () => {
			const json = '{"code":"foo"}';
			expect(() => parseJSON(json)).toThrow("JSON must be an array");
		});

		test("should throw for invalid JSON", () => {
			const json = "not valid json";
			expect(() => parseJSON(json)).toThrow();
		});
	});

	describe("validateRows", () => {
		const schema = z.object({
			code: z.string().min(1),
			name: z.string().min(1),
		});

		test("should validate valid rows", () => {
			const rows = [
				{ code: "foo", name: "Foo" },
				{ code: "bar", name: "Bar" },
			];
			const result = validateRows(rows, schema);
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
		});

		test("should return errors for invalid rows", () => {
			const rows = [
				{ code: "foo", name: "Foo" },
				{ code: "", name: "Bar" },
			];
			const result = validateRows(rows, schema);
			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors?.[0]?.row).toBe(2);
		});

		test("should collect all validation errors", () => {
			const rows = [
				{ code: "", name: "" },
				{ code: "", name: "" },
			];
			const result = validateRows(rows, schema);
			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(2);
		});
	});

	describe("detectFileType", () => {
		test("should detect CSV files", () => {
			expect(detectFileType("data.csv")).toBe("csv");
			expect(detectFileType("DATA.CSV")).toBe("csv");
			expect(detectFileType("path/to/file.csv")).toBe("csv");
		});

		test("should detect JSON files", () => {
			expect(detectFileType("data.json")).toBe("json");
			expect(detectFileType("DATA.JSON")).toBe("json");
			expect(detectFileType("path/to/file.json")).toBe("json");
		});

		test("should return unknown for other files", () => {
			expect(detectFileType("data.txt")).toBe("unknown");
			expect(detectFileType("data.xml")).toBe("unknown");
			expect(detectFileType("data")).toBe("unknown");
		});
	});

	describe("parseAndValidate", () => {
		const schema = z.object({
			code: z.string().min(1),
			name: z.string().min(1),
		});

		test("should parse and validate CSV", () => {
			const content = "code,name\nfoo,Foo";
			const result = parseAndValidate(content, "data.csv", schema);
			expect(result.success).toBe(true);
			expect(result.data).toEqual([{ code: "foo", name: "Foo" }]);
		});

		test("should parse and validate JSON", () => {
			const content = '[{"code":"foo","name":"Foo"}]';
			const result = parseAndValidate(content, "data.json", schema);
			expect(result.success).toBe(true);
			expect(result.data).toEqual([{ code: "foo", name: "Foo" }]);
		});

		test("should return error for unsupported file type", () => {
			const result = parseAndValidate("content", "data.txt", schema);
			expect(result.success).toBe(false);
			expect(result.errors?.[0]?.errors[0]).toContain(
				"サポートされていないファイル形式",
			);
		});

		test("should return error for empty data", () => {
			const result = parseAndValidate("code,name", "data.csv", schema);
			expect(result.success).toBe(false);
			expect(result.errors?.[0]?.errors[0]).toContain("データがありません");
		});

		test("should return validation errors", () => {
			const content = "code,name\n,Foo";
			const result = parseAndValidate(content, "data.csv", schema);
			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
		});

		test("should handle JSON parse errors", () => {
			const result = parseAndValidate("invalid json", "data.json", schema);
			expect(result.success).toBe(false);
		});
	});
});
