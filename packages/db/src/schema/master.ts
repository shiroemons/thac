import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const platforms = sqliteTable(
	"platforms",
	{
		code: text("code").primaryKey(),
		name: text("name").notNull(),
		category: text("category"),
		urlPattern: text("url_pattern"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_platforms_category").on(table.category),
		index("idx_platforms_sort_order").on(table.sortOrder),
	],
);

export const aliasTypes = sqliteTable(
	"alias_types",
	{
		code: text("code").primaryKey(),
		label: text("label").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
	},
	(table) => [index("idx_alias_types_sort_order").on(table.sortOrder)],
);

export const creditRoles = sqliteTable(
	"credit_roles",
	{
		code: text("code").primaryKey(),
		label: text("label").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
	},
	(table) => [index("idx_credit_roles_sort_order").on(table.sortOrder)],
);

export const officialWorkCategories = sqliteTable(
	"official_work_categories",
	{
		code: text("code").primaryKey(),
		name: text("name").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
	},
	(table) => [
		index("idx_official_work_categories_sort_order").on(table.sortOrder),
	],
);
