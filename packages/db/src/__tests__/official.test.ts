import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import { officialSongLinks, officialWorkLinks } from "../schema/official";

describe("official schema", () => {
	describe("officialWorkLinks table", () => {
		test("should have table name 'official_work_links'", () => {
			expect(getTableName(officialWorkLinks)).toBe("official_work_links");
		});

		test("should have id as primary key", () => {
			const idColumn = officialWorkLinks.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
			expect(idColumn.dataType).toBe("string");
		});

		test("should have required officialWorkId column", () => {
			const column = officialWorkLinks.officialWorkId;
			expect(column.name).toBe("official_work_id");
			expect(column.notNull).toBe(true);
		});

		test("should have required platformCode column", () => {
			const column = officialWorkLinks.platformCode;
			expect(column.name).toBe("platform_code");
			expect(column.notNull).toBe(true);
		});

		test("should have required url column", () => {
			const column = officialWorkLinks.url;
			expect(column.name).toBe("url");
			expect(column.notNull).toBe(true);
		});

		test("should have sortOrder column with default 0", () => {
			const column = officialWorkLinks.sortOrder;
			expect(column.name).toBe("sort_order");
			expect(column.notNull).toBe(true);
		});

		test("should have createdAt timestamp column", () => {
			const column = officialWorkLinks.createdAt;
			expect(column.name).toBe("created_at");
			expect(column.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const column = officialWorkLinks.updatedAt;
			expect(column.name).toBe("updated_at");
			expect(column.notNull).toBe(true);
		});
	});

	describe("officialSongLinks table", () => {
		test("should have table name 'official_song_links'", () => {
			expect(getTableName(officialSongLinks)).toBe("official_song_links");
		});

		test("should have id as primary key", () => {
			const idColumn = officialSongLinks.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
			expect(idColumn.dataType).toBe("string");
		});

		test("should have required officialSongId column", () => {
			const column = officialSongLinks.officialSongId;
			expect(column.name).toBe("official_song_id");
			expect(column.notNull).toBe(true);
		});

		test("should have required platformCode column", () => {
			const column = officialSongLinks.platformCode;
			expect(column.name).toBe("platform_code");
			expect(column.notNull).toBe(true);
		});

		test("should have required url column", () => {
			const column = officialSongLinks.url;
			expect(column.name).toBe("url");
			expect(column.notNull).toBe(true);
		});

		test("should have sortOrder column with default 0", () => {
			const column = officialSongLinks.sortOrder;
			expect(column.name).toBe("sort_order");
			expect(column.notNull).toBe(true);
		});

		test("should have createdAt timestamp column", () => {
			const column = officialSongLinks.createdAt;
			expect(column.name).toBe("created_at");
			expect(column.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const column = officialSongLinks.updatedAt;
			expect(column.name).toBe("updated_at");
			expect(column.notNull).toBe(true);
		});
	});
});
