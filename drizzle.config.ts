import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL!,
        token: process.env.TURSO_AUTH_TOKEN!
    }
});
