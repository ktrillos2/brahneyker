import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL || "libsql://website-rsusuarez.aws-us-east-1.turso.io",
        token: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJkNjJlMWYyNi1mMjFjLTRkNDQtYThhYi1jMzk5ZGQ3YzA3NWQiLCJpYXQiOjE3Njg1OTg1MTcsInJpZCI6IjhlZDMwZTcyLTEwZWMtNDlkYS05ODczLWFiYTFiMzM1NjM3YyJ9.lXGg3fo67mlSKlrcUvo_c1R3rU3XfiFHDv5B_7KhGyIIm7hf7_gBDcAL0ku2bfJ5Dibjr6esuReq91Thp-AHAA"
    }
});
