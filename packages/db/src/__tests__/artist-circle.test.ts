import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import {
	artistAliases,
	artists,
	circleLinks,
	circles,
	INITIAL_SCRIPTS,
} from "../schema/artist-circle";

describe("artist-circle schema", () => {
	describe("INITIAL_SCRIPTS constant", () => {
		test("should have all expected script types", () => {
			expect(INITIAL_SCRIPTS).toEqual([
				"latin",
				"hiragana",
				"katakana",
				"kanji",
				"digit",
				"symbol",
				"other",
			]);
		});
	});

	describe("artists table", () => {
		test("should have table name 'artists'", () => {
			expect(getTableName(artists)).toBe("artists");
		});

		test("should have id as primary key", () => {
			const idColumn = artists.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
			expect(idColumn.dataType).toBe("string");
		});

		test("should have required name column", () => {
			const nameColumn = artists.name;
			expect(nameColumn.name).toBe("name");
			expect(nameColumn.notNull).toBe(true);
		});

		test("should have optional nameJa column", () => {
			const nameJaColumn = artists.nameJa;
			expect(nameJaColumn.name).toBe("name_ja");
			expect(nameJaColumn.notNull).toBe(false);
		});

		test("should have optional nameEn column", () => {
			const nameEnColumn = artists.nameEn;
			expect(nameEnColumn.name).toBe("name_en");
			expect(nameEnColumn.notNull).toBe(false);
		});

		test("should have optional sortName column", () => {
			const sortNameColumn = artists.sortName;
			expect(sortNameColumn.name).toBe("sort_name");
			expect(sortNameColumn.notNull).toBe(false);
		});

		test("should have optional nameInitial column", () => {
			const nameInitialColumn = artists.nameInitial;
			expect(nameInitialColumn.name).toBe("name_initial");
			expect(nameInitialColumn.notNull).toBe(false);
		});

		test("should have required initialScript column", () => {
			const initialScriptColumn = artists.initialScript;
			expect(initialScriptColumn.name).toBe("initial_script");
			expect(initialScriptColumn.notNull).toBe(true);
		});

		test("should have optional notes column", () => {
			const notesColumn = artists.notes;
			expect(notesColumn.name).toBe("notes");
			expect(notesColumn.notNull).toBe(false);
		});

		test("should have createdAt timestamp column", () => {
			const createdAtColumn = artists.createdAt;
			expect(createdAtColumn.name).toBe("created_at");
			expect(createdAtColumn.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const updatedAtColumn = artists.updatedAt;
			expect(updatedAtColumn.name).toBe("updated_at");
			expect(updatedAtColumn.notNull).toBe(true);
		});
	});

	describe("artistAliases table", () => {
		test("should have table name 'artist_aliases'", () => {
			expect(getTableName(artistAliases)).toBe("artist_aliases");
		});

		test("should have id as primary key", () => {
			const idColumn = artistAliases.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
		});

		test("should have required artistId column", () => {
			const artistIdColumn = artistAliases.artistId;
			expect(artistIdColumn.name).toBe("artist_id");
			expect(artistIdColumn.notNull).toBe(true);
		});

		test("should have required name column", () => {
			const nameColumn = artistAliases.name;
			expect(nameColumn.name).toBe("name");
			expect(nameColumn.notNull).toBe(true);
		});

		test("should have optional aliasTypeCode column", () => {
			const aliasTypeCodeColumn = artistAliases.aliasTypeCode;
			expect(aliasTypeCodeColumn.name).toBe("alias_type_code");
			expect(aliasTypeCodeColumn.notNull).toBe(false);
		});

		test("should have optional nameInitial column", () => {
			const nameInitialColumn = artistAliases.nameInitial;
			expect(nameInitialColumn.name).toBe("name_initial");
			expect(nameInitialColumn.notNull).toBe(false);
		});

		test("should have required initialScript column", () => {
			const initialScriptColumn = artistAliases.initialScript;
			expect(initialScriptColumn.name).toBe("initial_script");
			expect(initialScriptColumn.notNull).toBe(true);
		});

		test("should have optional periodFrom column", () => {
			const periodFromColumn = artistAliases.periodFrom;
			expect(periodFromColumn.name).toBe("period_from");
			expect(periodFromColumn.notNull).toBe(false);
		});

		test("should have optional periodTo column", () => {
			const periodToColumn = artistAliases.periodTo;
			expect(periodToColumn.name).toBe("period_to");
			expect(periodToColumn.notNull).toBe(false);
		});

		test("should have createdAt timestamp column", () => {
			const createdAtColumn = artistAliases.createdAt;
			expect(createdAtColumn.name).toBe("created_at");
			expect(createdAtColumn.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const updatedAtColumn = artistAliases.updatedAt;
			expect(updatedAtColumn.name).toBe("updated_at");
			expect(updatedAtColumn.notNull).toBe(true);
		});
	});

	describe("circles table", () => {
		test("should have table name 'circles'", () => {
			expect(getTableName(circles)).toBe("circles");
		});

		test("should have id as primary key", () => {
			const idColumn = circles.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
		});

		test("should have required name column", () => {
			const nameColumn = circles.name;
			expect(nameColumn.name).toBe("name");
			expect(nameColumn.notNull).toBe(true);
		});

		test("should have optional nameJa column", () => {
			const nameJaColumn = circles.nameJa;
			expect(nameJaColumn.name).toBe("name_ja");
			expect(nameJaColumn.notNull).toBe(false);
		});

		test("should have optional nameEn column", () => {
			const nameEnColumn = circles.nameEn;
			expect(nameEnColumn.name).toBe("name_en");
			expect(nameEnColumn.notNull).toBe(false);
		});

		test("should have optional nameInitial column", () => {
			const nameInitialColumn = circles.nameInitial;
			expect(nameInitialColumn.name).toBe("name_initial");
			expect(nameInitialColumn.notNull).toBe(false);
		});

		test("should have required initialScript column", () => {
			const initialScriptColumn = circles.initialScript;
			expect(initialScriptColumn.name).toBe("initial_script");
			expect(initialScriptColumn.notNull).toBe(true);
		});

		test("should have optional notes column", () => {
			const notesColumn = circles.notes;
			expect(notesColumn.name).toBe("notes");
			expect(notesColumn.notNull).toBe(false);
		});

		test("should have createdAt timestamp column", () => {
			const createdAtColumn = circles.createdAt;
			expect(createdAtColumn.name).toBe("created_at");
			expect(createdAtColumn.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const updatedAtColumn = circles.updatedAt;
			expect(updatedAtColumn.name).toBe("updated_at");
			expect(updatedAtColumn.notNull).toBe(true);
		});
	});

	describe("circleLinks table", () => {
		test("should have table name 'circle_links'", () => {
			expect(getTableName(circleLinks)).toBe("circle_links");
		});

		test("should have id as primary key", () => {
			const idColumn = circleLinks.id;
			expect(idColumn.name).toBe("id");
			expect(idColumn.primary).toBe(true);
		});

		test("should have required circleId column", () => {
			const circleIdColumn = circleLinks.circleId;
			expect(circleIdColumn.name).toBe("circle_id");
			expect(circleIdColumn.notNull).toBe(true);
		});

		test("should have required platformCode column", () => {
			const platformCodeColumn = circleLinks.platformCode;
			expect(platformCodeColumn.name).toBe("platform_code");
			expect(platformCodeColumn.notNull).toBe(true);
		});

		test("should have required url column", () => {
			const urlColumn = circleLinks.url;
			expect(urlColumn.name).toBe("url");
			expect(urlColumn.notNull).toBe(true);
		});

		test("should have optional platformId column", () => {
			const platformIdColumn = circleLinks.platformId;
			expect(platformIdColumn.name).toBe("platform_id");
			expect(platformIdColumn.notNull).toBe(false);
		});

		test("should have optional handle column", () => {
			const handleColumn = circleLinks.handle;
			expect(handleColumn.name).toBe("handle");
			expect(handleColumn.notNull).toBe(false);
		});

		test("should have isOfficial column with default true", () => {
			const isOfficialColumn = circleLinks.isOfficial;
			expect(isOfficialColumn.name).toBe("is_official");
			expect(isOfficialColumn.notNull).toBe(true);
		});

		test("should have isPrimary column with default false", () => {
			const isPrimaryColumn = circleLinks.isPrimary;
			expect(isPrimaryColumn.name).toBe("is_primary");
			expect(isPrimaryColumn.notNull).toBe(true);
		});

		test("should have createdAt timestamp column", () => {
			const createdAtColumn = circleLinks.createdAt;
			expect(createdAtColumn.name).toBe("created_at");
			expect(createdAtColumn.notNull).toBe(true);
		});

		test("should have updatedAt timestamp column", () => {
			const updatedAtColumn = circleLinks.updatedAt;
			expect(updatedAtColumn.name).toBe("updated_at");
			expect(updatedAtColumn.notNull).toBe(true);
		});
	});
});
