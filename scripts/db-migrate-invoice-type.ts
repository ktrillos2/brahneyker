
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

async function main() {
    console.log("Running manual migration to add 'type' column to 'invoices'...")

    try {
        await db.run(sql`
      ALTER TABLE invoices ADD COLUMN type text DEFAULT 'general' NOT NULL;
    `)
        console.log("✅ Migration successful: Added 'type' column.")
    } catch (error) {
        console.error("❌ Migration failed:", error)
    }
}

main()
