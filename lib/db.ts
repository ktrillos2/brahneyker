import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

const url = process.env.TURSO_DATABASE_URL || "libsql://website-rsusuarez.aws-us-east-1.turso.io"
const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg0Mjc3NTQsImlkIjoiNGU0OGMyYzctYzRlOS00ZmFhLThhNTYtYTFhNjdhNTg2N2RjIiwicmlkIjoiYTA4NjFmMjgtODg0Yy00NmM2LTk1MzUtYzM2ODY3OTIwMWNiIn0.lzljrpqSrZhkGzwv3__i4Vs-zKzILSU_nQcmsQRQkMXLzJIvUC-tdBSMdzBN9wSCqs-kHDPSZtS7FD_X45W8Aw"

const client = createClient({
    url,
    authToken,
})

export const db = drizzle(client, { schema })
