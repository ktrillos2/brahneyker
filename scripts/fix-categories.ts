import "dotenv/config"
import { db } from "../lib/db"
import { products } from "../lib/schema"
import { eq } from "drizzle-orm"

async function main() {
    console.log("Fixing categories...")

    // Check how many have SHAPOO
    const toFix = await db.select().from(products).where(eq(products.category, "SHAPOO"))
    console.log(`Found ${toFix.length} products with category 'SHAPOO'`)

    if (toFix.length > 0) {
        const result = await db.update(products)
            .set({ category: "SHAMPOO" })
            .where(eq(products.category, "SHAPOO"))

        console.log(`Updated products. Category is now 'SHAMPOO'.`)
    } else {
        console.log("No products needed fixing.")
    }

    process.exit(0)
}

main().catch(console.error)
