import { db } from "../lib/db"
import { products } from "../lib/schema"
import { ne, count } from "drizzle-orm"

async function main() {
    console.log("Verifying minimum stock updates...")

    const result = await db.select({ count: count() })
        .from(products)
        .where(ne(products.minStock, 1))

    const failedCount = result[0]?.count || 0

    if (failedCount > 0) {
        console.error(`Verification FAILED: Found ${failedCount} products with minStock != 1`)
        process.exit(1)
    } else {
        console.log("Verification PASSED: All products have minStock = 1")
    }
    process.exit(0)
}

main().catch((err) => {
    console.error("Verification script failed:", err)
    process.exit(1)
})
