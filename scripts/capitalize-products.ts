
import { db } from "../lib/db"
import { products } from "../lib/schema"
import { eq } from "drizzle-orm"

function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function toSentenceCase(str: string) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function main() {
    console.log("Capitalizing product names...")

    const allProducts = await db.select().from(products)
    let updatedCount = 0

    for (const product of allProducts) {
        // The user said "solamente la primera letra en mayuscula , no todas en mayusculas"
        // This implies Sentence case: "Shampoo para cabello" instead of "Shampoo Para Cabello" or "SHAMPOO PARA CABELLO"
        // Let's go with Sentence Case as requested.
        const newName = toSentenceCase(product.name)

        if (newName !== product.name) {
            await db
                .update(products)
                .set({ name: newName })
                .where(eq(products.id, product.id))

            // console.log(`Renamed: "${product.name}" -> "${newName}"`)
            updatedCount++
        }
    }

    console.log(`\nFinished! Capitalized ${updatedCount} products.`)
}

main().catch((err) => {
    console.error("Error capitalizing products:", err)
    process.exit(1)
})
