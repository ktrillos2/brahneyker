import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL || "wss://website-rsusuarez.aws-us-east-1.turso.io",
        token: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg0Mjc3NTQsImlkIjoiNGU0OGMyYzctYzRlOS00ZmFhLThhNTYtYTFhNjdhNTg2N2RjIiwicmlkIjoiYTA4NjFmMjgtODg0Yy00NmM2LTk1MzUtYzM2ODY3OTIwMWNiIn0.lzljrpqSrZhkGzwv3__i4Vs-zKzILSU_nQcmsQRQkMXLzJIvUC-tdBSMdzBN9wSCqs-kHDPSZtS7FD_X45W8Aw"
    }
});
