import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	platforms,
} from "./master";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");

// Helper: 正規表現として有効か検証
const validRegex = z
	.string()
	.trim()
	.refine(
		(val) => {
			if (!val) return true;
			try {
				new RegExp(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: "有効な正規表現ではありません" },
	)
	.optional()
	.nullable();

// Platforms
export const insertPlatformSchema = createInsertSchema(platforms, {
	code: nonEmptyString,
	name: nonEmptyString,
	category: z.string().trim().optional().nullable(),
	urlPattern: validRegex,
}).omit({ createdAt: true, updatedAt: true });

export const updatePlatformSchema = createInsertSchema(platforms, {
	code: nonEmptyString.optional(),
	name: nonEmptyString.optional(),
	category: z.string().trim().optional().nullable(),
	urlPattern: validRegex,
})
	.omit({ createdAt: true, updatedAt: true, code: true })
	.partial();

export const selectPlatformSchema = createSelectSchema(platforms);

// AliasTypes
export const insertAliasTypeSchema = createInsertSchema(aliasTypes, {
	code: nonEmptyString,
	label: nonEmptyString,
	description: z.string().trim().optional().nullable(),
});

export const updateAliasTypeSchema = createInsertSchema(aliasTypes, {
	code: nonEmptyString.optional(),
	label: nonEmptyString.optional(),
	description: z.string().trim().optional().nullable(),
})
	.omit({ code: true })
	.partial();

export const selectAliasTypeSchema = createSelectSchema(aliasTypes);

// CreditRoles
export const insertCreditRoleSchema = createInsertSchema(creditRoles, {
	code: nonEmptyString,
	label: nonEmptyString,
	description: z.string().trim().optional().nullable(),
});

export const updateCreditRoleSchema = createInsertSchema(creditRoles, {
	code: nonEmptyString.optional(),
	label: nonEmptyString.optional(),
	description: z.string().trim().optional().nullable(),
})
	.omit({ code: true })
	.partial();

export const selectCreditRoleSchema = createSelectSchema(creditRoles);

// OfficialWorkCategories
export const insertOfficialWorkCategorySchema = createInsertSchema(
	officialWorkCategories,
	{
		code: nonEmptyString,
		name: nonEmptyString,
		description: z.string().trim().optional().nullable(),
	},
);

export const updateOfficialWorkCategorySchema = createInsertSchema(
	officialWorkCategories,
	{
		code: nonEmptyString.optional(),
		name: nonEmptyString.optional(),
		description: z.string().trim().optional().nullable(),
	},
)
	.omit({ code: true })
	.partial();

export const selectOfficialWorkCategorySchema = createSelectSchema(
	officialWorkCategories,
);

// Type exports
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type UpdatePlatform = z.infer<typeof updatePlatformSchema>;
export type SelectPlatform = z.infer<typeof selectPlatformSchema>;

export type InsertAliasType = z.infer<typeof insertAliasTypeSchema>;
export type UpdateAliasType = z.infer<typeof updateAliasTypeSchema>;
export type SelectAliasType = z.infer<typeof selectAliasTypeSchema>;

export type InsertCreditRole = z.infer<typeof insertCreditRoleSchema>;
export type UpdateCreditRole = z.infer<typeof updateCreditRoleSchema>;
export type SelectCreditRole = z.infer<typeof selectCreditRoleSchema>;

export type InsertOfficialWorkCategory = z.infer<
	typeof insertOfficialWorkCategorySchema
>;
export type UpdateOfficialWorkCategory = z.infer<
	typeof updateOfficialWorkCategorySchema
>;
export type SelectOfficialWorkCategory = z.infer<
	typeof selectOfficialWorkCategorySchema
>;
