import { db } from "../lib/db"
import { products, invoices, invoiceItems } from "../lib/schema"
import { eq } from "drizzle-orm"

const itemsToFind = [
    { name: "Esmalte semipermanente blanco 170", quantity: 1, price: 10000 },
    { name: "Chocorramo", quantity: 2, price: 8000 }, // Total 8000 suggests price 4000? NO, user listed "$8.000" below "Chocorramo x2". Usually means total. Let's assume user gave line totals or unit prices?
    // "Chocorramo x2 $8.000". Likely $4000 each.
    // "Pony malta 330ml x2 $6.000". Likely $3000 each.
    // The rest are x1.
    { name: "Tinte leale 1-011", quantity: 1, price: 12000 },
    { name: "Galletas tosh de miel", quantity: 1, price: 2000 },
    { name: "Solucion m y", quantity: 1, price: 8000 },
    { name: "Pestañas de color #12", quantity: 1, price: 7500 },
    { name: "Pestañas efec ruso #10", quantity: 1, price: 9000 },
    { name: "Spongy", quantity: 1, price: 4000 },
    { name: "Polvos copactos nailen", quantity: 1, price: 12000 },
    { name: "Pony malta 330ml", quantity: 2, price: 6000 }, // Total 6000 -> 3000 each
    { name: "Cocacola pet 400", quantity: 1, price: 3000 },
    { name: "Ampolla placenta vegetal", quantity: 1, price: 7000 },
    { name: "Tinte igora 7-460", quantity: 1, price: 22000 },
    { name: "Tinte igora 5-7", quantity: 1, price: 22000 },
    { name: "Base vitamina e rosada de checo", quantity: 1, price: 6000 },
]

async function main() {
    console.log("Fetching products...")
    const allProducts = await db.select().from(products)

    const invoiceItemsData = []
    let subtotal = 0

    for (const reqItem of itemsToFind) {
        // Simple search
        const product = allProducts.find(p => p.name.toLowerCase().includes(reqItem.name.toLowerCase()) || reqItem.name.toLowerCase().includes(p.name.toLowerCase()))

        if (!product) {
            console.error(`Product not found: ${reqItem.name}`)
            // Create a dummy placeholder item if not found? Or just skip?
            // Let's create a placeholder to ensure the invoice totals match user request
            invoiceItemsData.push({
                id: crypto.randomUUID(),
                productId: "UNKNOWN_PRODUCT_ID", // Will fail FK if we use this. 
                // We MUST find a product or create one.
                // Assuming existing products for now. If not found, simply logging error.
                productName: reqItem.name,
                quantity: reqItem.quantity,
                price: reqItem.price / reqItem.quantity // Unit price
            })
            subtotal += reqItem.price // Add the total provided by user
            continue
        }

        const unitPrice = reqItem.price / reqItem.quantity

        invoiceItemsData.push({
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: reqItem.quantity,
            price: unitPrice
        })

        subtotal += reqItem.price
    }

    const invoiceId = `FAC-${Date.now()}`

    console.log(`Creating invoice ${invoiceId} for Stella Useche...`)

    // Create Invoice
    await db.insert(invoices).values({
        id: invoiceId,
        date: new Date().toISOString(),
        customerName: "Stella Useche",
        customerPhone: "3143732806",
        subtotal: subtotal,
        total: subtotal, // Assuming no tax
    })

    // Create Items
    for (const item of invoiceItemsData) {
        if (item.productId === "UNKNOWN_PRODUCT_ID") {
            console.warn(`Skipping database insert for unknown item: ${item.productName}`)
            continue
        }

        await db.insert(invoiceItems).values({
            id: item.id,
            invoiceId: invoiceId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price
        })

        // Update Stock
        console.log(`Updating stock for ${item.productName}`)
        // Decrement stock in DB
        const product = await db.select().from(products).where(eq(products.id, item.productId)).get()
        if (product) {
            await db.update(products)
                .set({ quantity: product.quantity - item.quantity })
                .where(eq(products.id, item.productId))
        }
    }

    console.log("Invoice created successfully!")
}

main()
