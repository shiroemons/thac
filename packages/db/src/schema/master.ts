import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platforms = pgTable(
	"platforms",
	{
		code: text("code").primaryKey(),
		name: text("name").notNull(),
		category: text("category"),
		urlPattern: text("url_pattern"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_platforms_category").on(table.category),
		index("idx_platforms_sort_order").on(table.sortOrder),
	],
);

export const aliasTypes = pgTable(
	"alias_types",
	{
		code: text("code").primaryKey(),
		label: text("label").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("idx_alias_types_sort_order").on(table.sortOrder)],
);

export const creditRoles = pgTable(
	"credit_roles",
	{
		code: text("code").primaryKey(),
		label: text("label").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("idx_credit_roles_sort_order").on(table.sortOrder)],
);

export const officialWorkCategories = pgTable(
	"official_work_categories",
	{
		code: text("code").primaryKey(),
		name: text("name").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_official_work_categories_sort_order").on(table.sortOrder),
	],
);
