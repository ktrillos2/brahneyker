"use server"

import { db } from "@/lib/db"
import { invoices, invoiceItems, products, dailyOperations, dailyProductSales } from "@/lib/schema"
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getInvoices(page = 1, pageSize = 20, filterType?: string) {
    await verifySession()

    const offset = (page - 1) * pageSize

    // Construct where clause
    let whereClause = undefined
    if (filterType === 'daily') {
        whereClause = sql`${invoices.type} IN ('diaria-servicios', 'diaria-productos')`
    } else if (filterType === 'general') {
        whereClause = sql`${invoices.type} NOT IN ('diaria-servicios', 'diaria-productos')`
    }

    // 1. Fetch Invoices and Total Count in parallel
    const [invoicesData, totalResult] = await Promise.all([
        db.select()
            .from(invoices)
            .where(whereClause)
            .orderBy(desc(invoices.createdAt))
            .limit(pageSize)
            .offset(offset),
        db.select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(whereClause)
    ])

    const total = totalResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    // 2. Optimized Item Fetching (Avoid N+1)
    let invoicesWithItems: any[] = []

    if (invoicesData.length > 0) {
        const invoiceIds = invoicesData.map(inv => inv.id)

        // Fetch all items for the specific invoices
        const allItems = await db.select()
            .from(invoiceItems)
            .where(inArray(invoiceItems.invoiceId, invoiceIds))

        // Map items to invoices in memory
        invoicesWithItems = invoicesData.map(inv => {
            const items = allItems.filter(item => item.invoiceId === inv.id)
            return {
                ...inv,
                type: inv.type,
                tax: 0,
                items: items.map(item => ({
                    productId: item.productId,
                    name: item.productName,
                    price: item.price,
                    quantity: item.quantity,
                    barcode: ""
                }))
            }
        })
    }

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
                type: data.type || "general",
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
                if (item.productId) {
                    const product = await tx.select().from(products).where(eq(products.id, item.productId)).get()
                    if (product) {
                        await tx.update(products)
                            .set({ quantity: product.quantity - item.quantity })
                            .where(eq(products.id, item.productId))
                    }
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
            // Check if it's a daily invoice
            const invoice = await tx.select().from(invoices).where(eq(invoices.id, id)).get()
            if (!invoice) return

            if (invoice.type === 'diaria-servicios') {
                await tx.update(dailyOperations)
                    .set({ status: 'pendiente', invoiceId: null })
                    .where(eq(dailyOperations.invoiceId, id))
            } else if (invoice.type === 'diaria-productos') {
                await tx.update(dailyProductSales)
                    .set({ status: 'pendiente', invoiceId: null })
                    .where(eq(dailyProductSales.invoiceId, id))
            }

            // Get items to restore stock
            const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id))

            for (const item of items) {
                if (!item.productId) continue

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

export async function generateWeeklyInvoice(startDate: string, endDate: string) {
    await verifySession()

    try {
        // 1. Fetch Services (Detailed)
        const serviceOps = await db.select()
            .from(dailyOperations)
            .where(and(
                gte(dailyOperations.date, startDate),
                lte(dailyOperations.date, endDate),
                eq(dailyOperations.status, 'facturada')
            ))

        // 2. Fetch Product Sales (Detailed)
        const productSales = await db.select({
            id: dailyProductSales.id,
            quantity: dailyProductSales.quantity,
            price: products.price,
            name: products.name,
            productId: products.id
        })
            .from(dailyProductSales)
            .leftJoin(products, eq(dailyProductSales.productId, products.id))
            .where(and(
                gte(dailyProductSales.date, startDate),
                lte(dailyProductSales.date, endDate),
                eq(dailyProductSales.status, 'facturada')
            ))

        const serviceTotal = serviceOps.reduce((sum, op) => sum + op.amount, 0)
        const productTotal = productSales.reduce((sum, sale) => sum + (sale.quantity * (sale.price || 0)), 0)

        if (serviceOps.length === 0 && productSales.length === 0) {
            return { error: "No hay facturaciones diarias confirmadas en este rango para generar." }
        }

        // 3. Create Weekly Invoice
        const invoiceId = `SEM-${Date.now()}`
        const total = serviceTotal + productTotal

        await db.transaction(async (tx) => {
            await tx.insert(invoices).values({
                id: invoiceId,
                date: new Date().toISOString(),
                customerName: `Cierre Semanal`,
                customerPhone: `${startDate} al ${endDate}`,
                subtotal: total,
                total: total,
                type: "general",
            })

            // Add Service Items
            for (const op of serviceOps) {
                const clientInfo = op.clientName ? ` - Cliente: ${op.clientName}` : ''
                await tx.insert(invoiceItems).values({
                    id: crypto.randomUUID(),
                    invoiceId: invoiceId,
                    productId: null,
                    productName: `${op.stylist}: ${op.description}${clientInfo}`,
                    quantity: 1,
                    price: op.amount
                })
            }

            // Add Product Items
            for (const sale of productSales) {
                // Group by product or list individually? Listing individually for transparency as requested
                await tx.insert(invoiceItems).values({
                    id: crypto.randomUUID(),
                    invoiceId: invoiceId,
                    productId: sale.productId,
                    productName: sale.name || "Producto desconocido",
                    quantity: sale.quantity,
                    price: sale.price || 0
                })
            }
        })

        revalidatePath("/admin/dashboard/facturas")
        return { success: true, invoiceId }

    } catch (error) {
        console.error("Error generating weekly invoice:", error)
        return { error: "Error al generar factura semanal" }
    }
}
