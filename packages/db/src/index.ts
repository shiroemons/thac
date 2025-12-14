import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });

// Re-export drizzle-orm operators
export { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
// Re-export all schemas and validation
export * from "./schema";
