"use server"

import { db } from "@/lib/db"
import { products, invoiceItems, dailyProductSales } from "@/lib/schema"
import { eq, desc, like, or, sql } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getProducts(page = 1, pageSize = 10, query = "") {
    await verifySession()

    const offset = (page - 1) * pageSize

    const searchFilter = query
        ? or(
            like(products.name, `%${query}%`),
            like(products.barcode, `%${query}%`)
        )
        : undefined

    const [data, totalResult] = await Promise.all([
        db.select()
            .from(products)
            .where(searchFilter)
            .limit(pageSize)
            .offset(offset)
            .orderBy(desc(products.createdAt)),
        db.select({ count: sql<number>`count(*)` })
            .from(products)
            .where(searchFilter)
    ])

    const total = totalResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    return {
        products: data,
        total,
        totalPages,
        currentPage: page
    }
}

export async function createProduct(data: any) {
    await verifySession()

    try {
        // Check for duplicate barcode
        const existingProduct = await db.select()
            .from(products)
            .where(eq(products.barcode, data.barcode))
            .get()

        if (existingProduct) {
            return { error: "El código de barras ya existe" }
        }

        await db.insert(products).values({
            id: crypto.randomUUID(),
            name: data.name,
            description: data.description,
            category: data.category,
            price: Number(data.price),
            cost: Number(data.cost),
            quantity: Number(data.quantity),
            minStock: Number(data.minStock),
            barcode: data.barcode,
        })
        revalidatePath("/admin/dashboard/inventario")
        return { success: true }
    } catch (error) {
        console.error("Create product error:", error)
        return { error: "Error al crear producto" }
    }
}

export async function updateProduct(id: string, data: any) {
    await verifySession()

    try {
        // Check for duplicate barcode (excluding current product)
        const existingProduct = await db.select()
            .from(products)
            .where(sql`${products.barcode} = ${data.barcode} AND ${products.id} != ${id}`)
            .get()

        if (existingProduct) {
            return { error: "El código de barras ya existe" }
        }

        await db.update(products).set({
            name: data.name,
            description: data.description,
            category: data.category,
            price: Number(data.price),
            cost: Number(data.cost),
            quantity: Number(data.quantity),
            minStock: Number(data.minStock),
            barcode: data.barcode,
        }).where(eq(products.id, id))
        revalidatePath("/admin/dashboard/inventario")
        return { success: true }
    } catch (error) {
        console.error("Update product error:", error)
        return { error: "Error al actualizar producto" }
    }
}

// Older databases were created before migration 0001, where invoice_items.product_id
// is still NOT NULL. Unlinking a product from past invoices then fails, so rebuild the
// table with a nullable product_id (same data, same columns) before deleting.
async function ensureInvoiceItemsProductIdNullable() {
    const columns = await db.all<{ name: string; notnull: number }>(sql`PRAGMA table_info(invoice_items)`)
    const productIdColumn = columns.find((c) => c.name === "product_id")
    if (!productIdColumn || !productIdColumn.notnull) return

    await db.batch([
        db.run(sql`DROP TABLE IF EXISTS __new_invoice_items`),
        db.run(sql.raw(`CREATE TABLE __new_invoice_items (
            id text PRIMARY KEY NOT NULL,
            invoice_id text NOT NULL,
            product_id text,
            product_name text NOT NULL,
            quantity integer NOT NULL,
            price real NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE cascade,
            FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE set null
        )`)),
        db.run(sql`INSERT INTO __new_invoice_items (id, invoice_id, product_id, product_name, quantity, price) SELECT id, invoice_id, product_id, product_name, quantity, price FROM invoice_items`),
        db.run(sql`DROP TABLE invoice_items`),
        db.run(sql`ALTER TABLE __new_invoice_items RENAME TO invoice_items`),
    ])
}

export async function deleteProduct(id: string) {
    await verifySession()

    try {
        await ensureInvoiceItemsProductIdNullable()

        await db.transaction(async (tx) => {
            // 1. Unlink product from historical invoice items so past invoices preserve names and prices
            await tx.update(invoiceItems)
                .set({ productId: null })
                .where(eq(invoiceItems.productId, id))

            // 2. Remove daily product sales associated with this product
            await tx.delete(dailyProductSales)
                .where(eq(dailyProductSales.productId, id))

            // 3. Delete the product from the catalog
            await tx.delete(products)
                .where(eq(products.id, id))
        })

        revalidatePath("/admin/dashboard/inventario")
        revalidatePath("/admin/dashboard/facturas")
        revalidatePath("/admin/dashboard/daily-invoices")
        return { success: true }
    } catch (error) {
        console.error("Delete product error:", error)
        const detail = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : ""
        return { error: detail ? `Error al eliminar producto: ${detail}` : "Error al eliminar producto" }
    }
}

export async function getCategories() {
    await verifySession()
    try {
        const result = await db.selectDistinct({ category: products.category }).from(products)
        return result.map(r => r.category).filter(Boolean).sort()
    } catch (error) {
        console.error("Get categories error:", error)
        return []
    }
}
