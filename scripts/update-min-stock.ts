import { db } from "../lib/db"
import { products } from "../lib/schema"

async function main() {
    console.log("Updating all products minimum stock to 1...")

    try {
        const result = await db.update(products).set({ minStock: 1 })
        console.log("Successfully updated products.")
        // Drizzle's update result usually contains info about changes, 
        // but it depends on the driver. For SQLite it might be limited.
    } catch (error) {
        console.error("Error updating products:", error)
        process.exit(1)
    }

    console.log("Update completed.")
    process.exit(0)
}

main().catch((err) => {
    console.error("Script failed:", err)
    process.exit(1)
})
