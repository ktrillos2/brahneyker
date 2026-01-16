"use server"

import { db } from "@/lib/db"
import { invoices, invoiceItems, products } from "@/lib/schema"
import { eq, desc, sql } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getInvoices(page = 1, pageSize = 20) {
    await verifySession()

    const offset = (page - 1) * pageSize

    // This is a simple implementation. For better performance with many items, 
    // we might want to fetch invoices and then fetch items in a separate query or use a join carefully.
    // For now, let's fetch invoices and then their items.

    const [invoicesData, totalResult] = await Promise.all([
        db.select()
            .from(invoices)
            .orderBy(desc(invoices.createdAt))
            .limit(pageSize)
            .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(invoices)
    ])

    const total = totalResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    // Fetch items for these invoices
    const invoicesWithItems = await Promise.all(invoicesData.map(async (inv) => {
        const items = await db.select()
            .from(invoiceItems)
            .where(eq(invoiceItems.invoiceId, inv.id))

        return {
            ...inv,
            items: items.map(item => ({
                productId: item.productId,
                name: item.productName,
                price: item.price,
                quantity: item.quantity,
                barcode: "" // Not storing barcode in invoice items, but could join if needed
            }))
        }
    }))

    return {
        invoices: invoicesWithItems,
        total,
        totalPages,
        currentPage: page
    }
}

export async function createInvoice(data: any) {
    await verifySession()

    try {
        const invoiceId = data.id || `FAC-${Date.now()}`

        await db.transaction(async (tx) => {
            // Create Invoice
            await tx.insert(invoices).values({
                id: invoiceId,
                date: data.date,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                subtotal: data.subtotal,
                total: data.total,
            })

            // Create Invoice Items
            for (const item of data.items) {
                await tx.insert(invoiceItems).values({
                    id: crypto.randomUUID(),
                    invoiceId: invoiceId,
                    productId: item.productId,
                    productName: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })

                // Decrease stock
                // Note: The frontend was already doing this via updateProduct, 
                // but it's safer to do it here or ensure we don't double count if we keep frontend logic.
                // The prompt asked to "replace localStorage", so we should ideally move business logic here.
                // However, to keep it simple and compatible with existing frontend logic which calculates totals,
                // we will stick to just saving the invoice here.
                // BUT, the plan said "stock restoration logic to backend", so let's handle stock here too?
                // Actually, the current frontend logic subtracts stock *before* generating invoice. 
                // Let's assume the frontend sends us the items AND we should ensure stock is decremented? 
                // OR better, let's let the frontend handle the decrement for now to minimize refactor risk, 
                // and we just handle the persistence of the invoice.

                // WAIT! The frontend does `updatedProducts` locally and `setProducts`. 
                // It does NOT call an API to update stock in DB in `handleGenerateInvoice`!
                // It ONLY updates local state. 
                // So we MUST update DB stock here!

                const product = await tx.select().from(products).where(eq(products.id, item.productId)).get()
                if (product) {
                    await tx.update(products)
                        .set({ quantity: product.quantity - item.quantity })
                        .where(eq(products.id, item.productId))
                }
            }
        })

        revalidatePath("/admin/dashboard/facturas")
        return { success: true, invoiceId }
    } catch (error) {
        console.error("Create invoice error:", error)
        return { error: "Error al guardar factura" }
    }
}

export async function deleteInvoice(id: string) {
    await verifySession()

    try {
        await db.transaction(async (tx) => {
            // Get items to restore stock
            const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id))

            for (const item of items) {
                const product = await tx.select().from(products).where(eq(products.id, item.productId)).get()
                if (product) {
                    await tx.update(products)
                        .set({ quantity: product.quantity + item.quantity })
                        .where(eq(products.id, item.productId))
                }
            }

            // Delete invoice (cascade deletes items)
            await tx.delete(invoices).where(eq(invoices.id, id))
        })

        revalidatePath("/admin/dashboard/facturas")
        return { success: true }
    } catch (error) {
        console.error("Delete invoice error:", error)
        return { error: "Error al eliminar factura" }
    }
}
