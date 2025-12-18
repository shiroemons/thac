import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { eventDays, eventSeries, events } from "./event";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// 日付バリデーション（YYYY-MM-DD形式）
const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
	.optional()
	.nullable();

const requiredDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください");

// EventSeries
export const insertEventSeriesSchema = createInsertSchema(eventSeries, {
	id: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	sortOrder: z
		.number()
		.int()
		.min(0, "0以上の整数を入力してください")
		.optional(),
}).omit({ createdAt: true, updatedAt: true });

export const updateEventSeriesSchema = z.object({
	name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
	sortOrder: z
		.number()
		.int()
		.min(0, "0以上の整数を入力してください")
		.optional(),
});

export const selectEventSeriesSchema = createSelectSchema(eventSeries);

// Events
export const insertEventSchema = createInsertSchema(events, {
	id: nonEmptyString,
	eventSeriesId: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	edition: z
		.number()
		.int()
		.positive("正の整数を入力してください")
		.optional()
		.nullable(),
	totalDays: z
		.number()
		.int()
		.positive("正の整数を入力してください")
		.optional()
		.nullable(),
	venue: optionalString.pipe(
		z.string().max(200, "200文字以内で入力してください").optional().nullable(),
	),
	startDate: dateSchema,
	endDate: dateSchema,
}).omit({ createdAt: true, updatedAt: true });

export const updateEventSchema = z.object({
	eventSeriesId: nonEmptyString.optional(),
	name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
	edition: z
		.number()
		.int()
		.positive("正の整数を入力してください")
		.optional()
		.nullable(),
	totalDays: z
		.number()
		.int()
		.positive("正の整数を入力してください")
		.optional()
		.nullable(),
	venue: optionalString.pipe(
		z.string().max(200, "200文字以内で入力してください").optional().nullable(),
	),
	startDate: dateSchema,
	endDate: dateSchema,
});

export const selectEventSchema = createSelectSchema(events);

// EventDays
export const insertEventDaySchema = createInsertSchema(eventDays, {
	id: nonEmptyString,
	eventId: nonEmptyString,
	dayNumber: z.number().int().positive("正の整数を入力してください"),
	date: requiredDateSchema,
}).omit({ createdAt: true, updatedAt: true });

export const updateEventDaySchema = z.object({
	dayNumber: z.number().int().positive("正の整数を入力してください").optional(),
	date: requiredDateSchema.optional(),
});

export const selectEventDaySchema = createSelectSchema(eventDays);

// Type exports
export type InsertEventSeries = z.infer<typeof insertEventSeriesSchema>;
export type UpdateEventSeries = z.infer<typeof updateEventSeriesSchema>;
export type SelectEventSeries = z.infer<typeof selectEventSeriesSchema>;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type SelectEvent = z.infer<typeof selectEventSchema>;

export type InsertEventDay = z.infer<typeof insertEventDaySchema>;
export type UpdateEventDay = z.infer<typeof updateEventDaySchema>;
export type SelectEventDay = z.infer<typeof selectEventDaySchema>;
