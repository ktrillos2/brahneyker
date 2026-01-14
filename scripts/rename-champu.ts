
import { db } from "../lib/db"
import { products } from "../lib/schema"
import { eq, like } from "drizzle-orm"

async function main() {
    console.log("Renaming CHAMPU to Shampoo...")

    // Find all products containing CHAMPU (case sensitive usually in SQLite unless collated, but let's assume it matches)
    // The user said "CHAMPU" (uppercase), so we target that.
    const matchingProducts = await db.select().from(products).where(like(products.name, "%CHAMPU%"))

    console.log(`Found ${matchingProducts.length} potential matches.`)

    let updatedCount = 0

    for (const product of matchingProducts) {
        const newName = product.name.replace(/CHAMPU/g, "Shampoo")

        if (newName !== product.name) {
            await db
                .update(products)
                .set({ name: newName })
                .where(eq(products.id, product.id))

            console.log(`Renamed: "${product.name}" -> "${newName}"`)
            updatedCount++
        }
    }

    console.log(`\nFinished! Renamed ${updatedCount} products.`)
}

main().catch((err) => {
    console.error("Error renaming products:", err)
    process.exit(1)
})
