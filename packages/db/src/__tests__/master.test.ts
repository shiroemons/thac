import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import {
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	platforms,
} from "../schema/master";

describe("master schema", () => {
	describe("platforms table", () => {
		test("should have table name 'platforms'", () => {
			expect(getTableName(platforms)).toBe("platforms");
		});

		test("should have code as primary key", () => {
			const codeColumn = platforms.code;
			expect(codeColumn.name).toBe("code");
			expect(codeColumn.primary).toBe(true);
			expect(codeColumn.dataType).toBe("string");
		});

		test("should have required name column", () => {
			const nameColumn = platforms.name;
			expect(nameColumn.name).toBe("name");
			expect(nameColumn.notNull).toBe(true);
		});

		test("should have optional category column", () => {
			const categoryColumn = platforms.category;
			expect(categoryColumn.name).toBe("category");
			expect(categoryColumn.notNull).toBe(false);
		});

		test("should have optional urlPattern column", () => {
			const urlPatternColumn = platforms.urlPattern;
			expect(urlPatternColumn.name).toBe("url_pattern");
			expect(urlPatternColumn.notNull).toBe(false);
		});

		test("should have createdAt timestamp column", () => {
			const createdAtColumn = platforms.createdAt;
			expect(createdAtColumn.name).toBe("created_at");
			expect(createdAtColumn.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const updatedAtColumn = platforms.updatedAt;
			expect(updatedAtColumn.name).toBe("updated_at");
			expect(updatedAtColumn.notNull).toBe(true);
		});
	});

	describe("aliasTypes table", () => {
		test("should have table name 'alias_types'", () => {
			expect(getTableName(aliasTypes)).toBe("alias_types");
		});

		test("should have code as primary key", () => {
			const codeColumn = aliasTypes.code;
			expect(codeColumn.name).toBe("code");
			expect(codeColumn.primary).toBe(true);
		});

		test("should have required label column", () => {
			const labelColumn = aliasTypes.label;
			expect(labelColumn.name).toBe("label");
			expect(labelColumn.notNull).toBe(true);
		});

		test("should have optional description column", () => {
			const descriptionColumn = aliasTypes.description;
			expect(descriptionColumn.name).toBe("description");
			expect(descriptionColumn.notNull).toBe(false);
		});

		test("should not have timestamp columns", () => {
			expect(Object.keys(aliasTypes)).not.toContain("createdAt");
			expect(Object.keys(aliasTypes)).not.toContain("updatedAt");
		});
	});

	describe("creditRoles table", () => {
		test("should have table name 'credit_roles'", () => {
			expect(getTableName(creditRoles)).toBe("credit_roles");
		});

		test("should have code as primary key", () => {
			const codeColumn = creditRoles.code;
			expect(codeColumn.name).toBe("code");
			expect(codeColumn.primary).toBe(true);
		});

		test("should have required label column", () => {
			const labelColumn = creditRoles.label;
			expect(labelColumn.name).toBe("label");
			expect(labelColumn.notNull).toBe(true);
		});

		test("should have optional description column", () => {
			const descriptionColumn = creditRoles.description;
			expect(descriptionColumn.name).toBe("description");
			expect(descriptionColumn.notNull).toBe(false);
		});

		test("should not have timestamp columns", () => {
			expect(Object.keys(creditRoles)).not.toContain("createdAt");
			expect(Object.keys(creditRoles)).not.toContain("updatedAt");
		});
	});

	describe("officialWorkCategories table", () => {
		test("should have table name 'official_work_categories'", () => {
			expect(getTableName(officialWorkCategories)).toBe(
				"official_work_categories",
			);
		});

		test("should have code as primary key", () => {
			const codeColumn = officialWorkCategories.code;
			expect(codeColumn.name).toBe("code");
			expect(codeColumn.primary).toBe(true);
		});

		test("should have required name column", () => {
			const nameColumn = officialWorkCategories.name;
			expect(nameColumn.name).toBe("name");
			expect(nameColumn.notNull).toBe(true);
		});

		test("should have optional description column", () => {
			const descriptionColumn = officialWorkCategories.description;
			expect(descriptionColumn.name).toBe("description");
			expect(descriptionColumn.notNull).toBe(false);
		});

		test("should not have timestamp columns", () => {
			expect(Object.keys(officialWorkCategories)).not.toContain("createdAt");
			expect(Object.keys(officialWorkCategories)).not.toContain("updatedAt");
		});
	});
});
