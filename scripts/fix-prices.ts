
import { db } from "../lib/db"
import { products } from "../lib/schema"
import { eq, lt, or } from "drizzle-orm"

async function main() {
    console.log("Starting price correction...")

    const allProducts = await db.select().from(products)
    let updatedCount = 0

    for (const product of allProducts) {
        let newPrice = product.price
        let newCost = product.cost
        let changed = false

        // Threshold: Assume anything less than 1000 is missing three zeros
        // This avoids accidental double-correction of already correct prices (e.g. 20000)
        if (product.price > 0 && product.price < 1000) {
            newPrice = product.price * 1000
            changed = true
        }

        if (product.cost > 0 && product.cost < 1000) {
            newCost = product.cost * 1000
            changed = true
        }

        if (changed) {
            await db
                .update(products)
                .set({
                    price: newPrice,
                    cost: newCost,
                })
                .where(eq(products.id, product.id))

            console.log(`Updated ${product.name}: Price ${product.price} -> ${newPrice}, Cost ${product.cost} -> ${newCost}`)
            updatedCount++
        }
    }

    console.log(`\nFinished! Updated ${updatedCount} products.`)
}

main().catch((err) => {
    console.error("Error fixing prices:", err)
    process.exit(1)
})
