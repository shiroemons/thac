import { db } from "@thac/db";
import * as schema from "@thac/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nanoid } from "nanoid";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: schema,
	}),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
		discord: {
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || "",
			clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google", "discord", "github"],
		},
	},
	user: {
		additionalFields: {
			onboardingCompleted: {
				type: "boolean",
				defaultValue: false,
				required: false,
				input: true,
			},
		},
		deleteUser: {
			enabled: true,
		},
	},
	plugins: [
		admin({
			defaultRole: "user",
			adminRoles: ["admin"],
		}),
	],
	advanced: {
		database: {
			generateId: () => nanoid(),
		},
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
});
