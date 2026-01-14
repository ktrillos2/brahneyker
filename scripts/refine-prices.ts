
import { db } from "../lib/db"
import { products } from "../lib/schema"
import { eq } from "drizzle-orm"

async function main() {
    console.log("Starting price refinement...")

    const allProducts = await db.select().from(products)
    let updatedCount = 0

    for (const product of allProducts) {
        let newPrice = product.price
        let newCost = product.cost
        let changed = false

        // Logic: Correct values that were likely actual low prices (100-999 pesos)
        // If we multiplied 650 * 1000 -> 650000, we should revert it.
        // Range to check: 100,000 to 999,000 inclusive, assuming they were multiplied.

        // Check Price
        // If price is exactly divisible by 1000 and the original base (price / 1000) was >= 100
        // We treat 100.000 as a fast cutoff. 
        // Wait, if an item was truly 200 (200.000), and I leave it as 200.000, that's fine.
        // But if it was 200 (candy), and I made it 200.000, that's wrong.
        // Using context clues (Cost vs Price) might help.
        // Example: Product "Agua", Price 2000, Cost 650000. 
        // Cost > Price is a huge red flag. 

        if (product.cost > product.price && product.cost >= 100000 && product.price < 50000) {
            // Likely a cost that was multiplied wrongly.
            if (product.cost % 1000 === 0) {
                newCost = product.cost / 1000
                changed = true
                console.log(`Fixing Cost > Price: ${product.name} Cost ${product.cost} -> ${newCost}`)
            }
        }

        // Heuristic: If name suggests cheap item (candy, gancho, etc)
        const cheapKeywords = ["barrilet", "caramelo", "gancho", "galle", "chokis", "bomb", "sachet", "sobre"]
        const nameLower = product.name.toLowerCase()
        const isCheapItem = cheapKeywords.some(k => nameLower.includes(k))

        if (isCheapItem) {
            if (product.price >= 100000 && product.price % 1000 === 0) {
                newPrice = product.price / 1000
                changed = true
                console.log(`Fixing Cheap Item Price: ${product.name} Price ${product.price} -> ${newPrice}`)
            }
            if (product.cost >= 100000 && product.cost % 1000 === 0) {
                newCost = product.cost / 1000
                changed = true
                console.log(`Fixing Cheap Item Cost: ${product.name} Cost ${product.cost} -> ${newCost}`)
            }
        }

        if (changed) {
            await db
                .update(products)
                .set({
                    price: newPrice,
                    cost: newCost,
                })
                .where(eq(products.id, product.id))

            updatedCount++
        }
    }

    console.log(`\nFinished! Refined ${updatedCount} products.`)
}

main().catch((err) => {
    console.error("Error refining prices:", err)
    process.exit(1)
})
