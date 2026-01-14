import "dotenv/config"
import { db } from "../lib/db"
import { products } from "../lib/schema"
import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"
import { eq } from "drizzle-orm"

async function main() {
    const csvPath = path.join(process.cwd(), "products.csv")

    if (!fs.existsSync(csvPath)) {
        console.error("products.csv not found in project root.")
        process.exit(1)
    }

    console.log("Reading products.csv...")
    const fileContent = fs.readFileSync(csvPath, "utf-8")

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ",",
        relax_quotes: true,
        relax_column_count: true,
        from_line: 2 // Headers are on line 2
    })

    console.log(`Found ${records.length} records in CSV.`)

    let totalImported = 0
    let skippedDuplicates = 0
    let failed = 0

    // Optimization: Fetch all existing barcodes once
    console.log("Fetching existing barcodes...")
    const existingProducts = await db.select({ barcode: products.barcode }).from(products)
    const existingBarcodes = new Set(existingProducts.map(p => p.barcode))
    console.log(`Found ${existingBarcodes.size} existing barcodes.`)

    const productsToInsert: typeof products.$inferInsert[] = []

    for (const record of records) {
        // Map columns
        // CODIGO DE BARRAS -> barcode
        // DESCRIPCIÓN DEL ARTICULO -> name
        // CATEGORIA -> category
        // PRECIO DE VENTA UNO -> price
        // V COSTO -> cost
        // CAN UNID -> quantity

        const parseCurrency = (val: string) => {
            if (!val) return 0
            // Remove . (thousands) then replace , with . (decimals)
            // Example: "1.500,00" -> "1500.00"
            const clean = val.replace(/\./g, "").replace(",", ".")
            return Number(clean) || 0
        }

        const parseQuantity = (val: string) => {
            if (!val) return 0
            const clean = val.replace(/\./g, "").replace(",", ".")
            return Number(clean) || 0
        }

        const name = record["DESCRIPCIÓN DEL ARTICULO"]
        let barcode = record["CODIGO DE BARRAS"]

        // Skip invalid rows
        if (!name && !barcode) continue

        if (!barcode || barcode.trim() === "") {
            // Fallback
            barcode = record["CODIGO INTERNO"] || record["REFERENCIA DEL ARTICULO"]
            if (!barcode || barcode.trim() === "") {
                barcode = "GEN-" + Math.random().toString(36).substring(7)
            }
        }

        // Check for duplicates in memory
        if (existingBarcodes.has(barcode)) {
            skippedDuplicates++
            continue
        }

        // Also check if we already added it to the current batch (duplicate in CSV)
        if (productsToInsert.find(p => p.barcode === barcode)) {
            skippedDuplicates++
            continue
        }

        const price = parseCurrency(record["PRECIO DE VENTA UNO"])
        const cost = parseCurrency(record["V COSTO"])
        const quantity = parseQuantity(record["CAN UNID"])
        const category = record["CATEGORIA"] || "General"
        const description = record["OBSERVACIONES"] || ""

        productsToInsert.push({
            id: crypto.randomUUID(),
            name: name || "Sin Nombre",
            description,
            category,
            price,
            cost,
            quantity,
            minStock: 5,
            barcode,
        })
    }

    // Batch insert
    const BATCH_SIZE = 50;
    for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
        const batch = productsToInsert.slice(i, i + BATCH_SIZE)
        try {
            await db.insert(products).values(batch)
            totalImported += batch.length
            console.log(`Imported batch ${Math.floor(i / BATCH_SIZE) + 1} (${totalImported}/${productsToInsert.length})`)
        } catch (err) {
            console.error(`Failed to import batch starting index ${i}:`, err)
            failed += batch.length
        }
    }

    console.log(`\nImport Summary:`)
    console.log(`Total Records: ${records.length}`)
    console.log(`Imported: ${totalImported}`)
    console.log(`Skipped (Duplicates): ${skippedDuplicates}`)
    console.log(`Failed: ${failed}`)
    process.exit(0)
}

main().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
