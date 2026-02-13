import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

async function main() {
    console.log("Starting schema repair...")

    try {
        console.log("Adding client_name to daily_operations...")
        try {
            await db.run(sql`ALTER TABLE daily_operations ADD COLUMN client_name text;`)
            console.log("Success: Added client_name column.")
        } catch (e: any) {
            if (e.message && e.message.includes("duplicate column name")) {
                console.log("Info: client_name column already exists.")
            } else {
                console.error("Error adding client_name:", e)
            }
        }

        console.log("Schema repair check completed.")

    } catch (error) {
        console.error("Critical error during repair:", error)
    }
}

main()
