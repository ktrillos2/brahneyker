"use server"

import { db } from "@/lib/db"
import { dailyOperations, dailyProductSales, invoices, invoiceItems, products } from "@/lib/schema"
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { assertDaysOpen, ClosedDayError } from "@/lib/closures"
import { verifySession } from "@/lib/auth"

function revalidateDailyViews() {
    revalidatePath("/admin/dashboard/daily-invoices")
    revalidatePath("/admin/daily-invoices")
    revalidatePath("/admin/dashboard/ingresos")
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof ClosedDayError ? error.message : fallback
}

async function operationDates(ids: string[]) {
    if (ids.length === 0) return []
    const rows = await db.select({ date: dailyOperations.date }).from(dailyOperations).where(inArray(dailyOperations.id, ids))
    return rows.map((r) => r.date)
}

async function productSaleDates(ids: string[]) {
    if (ids.length === 0) return []
    const rows = await db.select({ date: dailyProductSales.date }).from(dailyProductSales).where(inArray(dailyProductSales.id, ids))
    return rows.map((r) => r.date)
}

// Daily Operations (Services)

export async function addDailyOperation(data: {
    stylist: string
    clientName?: string
    description: string
    amount: number
    date: string
}) {
    try {
        await assertDaysOpen([data.date])
        const newRecord = {
            id: crypto.randomUUID(),
            stylist: data.stylist,
            clientName: data.clientName?.trim() || null,
            description: data.description.trim(),
            amount: data.amount,
            date: data.date,
            status: "pendiente",
        }
        await db.insert(dailyOperations).values(newRecord)
        revalidateDailyViews()
        return { success: true, operation: newRecord }
    } catch (error) {
        console.error("Error adding daily operation:", error)
        return { success: false, error: errorMessage(error, "Error al registrar servicio. Verifique la conexión o contacte soporte.") }
    }
}

export async function getDailyOperations(date: string) {
    return await db.select().from(dailyOperations).where(eq(dailyOperations.date, date))
}

export async function deleteDailyOperation(id: string) {
    return deleteDailyOperations([id])
}

export async function deleteDailyOperations(ids: string[]) {
    if (ids.length === 0) return { success: true }
    try {
        await assertDaysOpen(await operationDates(ids))
        await db.delete(dailyOperations).where(inArray(dailyOperations.id, ids))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error deleting daily operations:", error)
        return { success: false, error: errorMessage(error, "Error al eliminar servicio") }
    }
}

export async function updateDailyOperation(id: string, data: {
    stylist: string
    clientName?: string
    description: string
    amount: number
}) {
    try {
        await assertDaysOpen(await operationDates([id]))
        await db.update(dailyOperations)
            .set(data)
            .where(eq(dailyOperations.id, id))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error updating daily operation:", error)
        return { success: false, error: errorMessage(error, "Error al actualizar servicio. Verifique la conexión o contacte soporte.") }
    }
}

export async function updateDailyOperationAmount(id: string, amount: number) {
    await verifySession()
    if (!(amount > 0)) return { success: false, error: "El valor debe ser mayor a 0" }
    try {
        const op = await db.select().from(dailyOperations).where(eq(dailyOperations.id, id)).get()
        if (!op) return { success: false, error: "El servicio ya no existe" }
        if (op.status === "facturada") return { success: false, error: "Este servicio ya está facturado y no se puede cambiar" }
        await assertDaysOpen([op.date])
        await db.update(dailyOperations).set({ amount }).where(eq(dailyOperations.id, id))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error updating daily operation amount:", error)
        return { success: false, error: errorMessage(error, "Error al actualizar el valor") }
    }
}

// Daily Product Sales

export async function addDailyProductSale(data: {
    productId: string
    quantity: number
    date: string
}) {
    try {
        await assertDaysOpen([data.date])
        await db.insert(dailyProductSales).values({
            id: crypto.randomUUID(),
            ...data,
            status: "pendiente",
        })
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error adding daily product sale:", error)
        return { success: false, error: errorMessage(error, "Error al registrar venta. Verifique la conexión o contacte soporte.") }
    }
}

export async function getDailyProductSales(date: string) {
    const sales = await db.select({
        id: dailyProductSales.id,
        date: dailyProductSales.date,
        quantity: dailyProductSales.quantity,
        status: dailyProductSales.status,
        productName: products.name,
        productPrice: products.price,
        productId: dailyProductSales.productId,
    })
        .from(dailyProductSales)
        .leftJoin(products, eq(dailyProductSales.productId, products.id))
        .where(eq(dailyProductSales.date, date))

    return sales
}

export async function deleteDailyProductSale(id: string) {
    return deleteDailyProductSales([id])
}

export async function deleteDailyProductSales(ids: string[]) {
    if (ids.length === 0) return { success: true }
    try {
        await assertDaysOpen(await productSaleDates(ids))
        await db.delete(dailyProductSales).where(inArray(dailyProductSales.id, ids))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error deleting daily product sales:", error)
        return { success: false, error: errorMessage(error, "Error al eliminar venta") }
    }
}

// Paginated product search for pickers, so the whole inventory is not loaded at once.
export async function searchProducts(query: string, offset = 0, limit = 20) {
    await verifySession()
    const term = query.trim()
    const rows = await db.select({ id: products.id, name: products.name, price: products.price, quantity: products.quantity })
        .from(products)
        .where(term ? sql`${products.name} LIKE ${"%" + term + "%"}` : undefined)
        .orderBy(products.name)
        .limit(limit + 1)
        .offset(offset)
    return { products: rows.slice(0, limit), hasMore: rows.length > limit }
}

// Weekly Summary

export async function getWeeklyRecords(startDate: string, endDate: string) {
    const [operations, productSales] = await Promise.all([
        db.select({
            date: dailyOperations.date,
            stylist: dailyOperations.stylist,
            amount: dailyOperations.amount,
            status: dailyOperations.status,
        })
            .from(dailyOperations)
            .where(and(gte(dailyOperations.date, startDate), lte(dailyOperations.date, endDate))),
        db.select({
            date: dailyProductSales.date,
            quantity: dailyProductSales.quantity,
            status: dailyProductSales.status,
            productPrice: products.price,
        })
            .from(dailyProductSales)
            .leftJoin(products, eq(dailyProductSales.productId, products.id))
            .where(and(gte(dailyProductSales.date, startDate), lte(dailyProductSales.date, endDate))),
    ])

    return { operations, productSales }
}

// Invoice Generation

export async function generateInvoiceFromDaily(
    date: string,
    operationIds: string[],
    productSaleIds: string[]
) {
    let serviceInvoiceId = null
    let productInvoiceId = null

    // --- 1. HANDLE SERVICES INVOICE ---
    if (operationIds.length > 0) {
        const operations = await db.select().from(dailyOperations).where(inArray(dailyOperations.id, operationIds))

        if (operations.length > 0) {
            let subtotal = 0
            operations.forEach(op => subtotal += op.amount)

            serviceInvoiceId = crypto.randomUUID()
            await db.insert(invoices).values({
                id: serviceInvoiceId,
                date: date + 'T12:00:00',
                customerName: "Servicios del Día - " + date,
                customerPhone: "",
                subtotal: subtotal,
                total: subtotal,
                type: "diaria-servicios",
            })

            for (const op of operations) {
                await db.insert(invoiceItems).values({
                    id: crypto.randomUUID(),
                    invoiceId: serviceInvoiceId,
                    productId: null,
                    productName: `${op.stylist}: ${op.description}`,
                    quantity: 1,
                    price: op.amount,
                })
            }

            await db.update(dailyOperations)
                .set({ status: "facturada", invoiceId: serviceInvoiceId })
                .where(inArray(dailyOperations.id, operationIds))
        }
    }

    // --- 2. HANDLE PRODUCTS INVOICE ---
    if (productSaleIds.length > 0) {
        const productSales = await db.select({
            id: dailyProductSales.id,
            quantity: dailyProductSales.quantity,
            price: products.price,
            name: products.name,
            productId: products.id
        })
            .from(dailyProductSales)
            .leftJoin(products, eq(dailyProductSales.productId, products.id))
            .where(inArray(dailyProductSales.id, productSaleIds))

        if (productSales.length > 0) {
            let subtotal = 0
            productSales.forEach(sale => subtotal += (sale.quantity * (sale.price || 0)))

            productInvoiceId = crypto.randomUUID()
            await db.insert(invoices).values({
                id: productInvoiceId,
                date: date + 'T12:00:00',
                customerName: "Venta de Productos - " + date,
                customerPhone: "",
                subtotal: subtotal,
                total: subtotal,
                type: "diaria-productos",
            })

            for (const sale of productSales) {
                if (!sale.productId) continue
                await db.insert(invoiceItems).values({
                    id: crypto.randomUUID(),
                    invoiceId: productInvoiceId,
                    productId: sale.productId,
                    productName: sale.name || "Producto desconocido",
                    quantity: sale.quantity,
                    price: sale.price || 0,
                })

                // Decrease stock
                const product = await db.select().from(products).where(eq(products.id, sale.productId)).get()
                if (product) {
                    await db.update(products)
                        .set({ quantity: product.quantity - sale.quantity })
                        .where(eq(products.id, sale.productId))
                }
            }

            await db.update(dailyProductSales)
                .set({ status: "facturada", invoiceId: productInvoiceId })
                .where(inArray(dailyProductSales.id, productSaleIds))
        }
    }

    revalidatePath("/admin/dashboard/daily-invoices")
    revalidatePath("/admin/daily-invoices")
    revalidatePath("/admin/dashboard/ingresos")
    revalidatePath("/admin/dashboard/facturas")

    if (!serviceInvoiceId && !productInvoiceId) {
        return { success: false, error: "No items selected" }
    }

    return { success: true, serviceInvoiceId, productInvoiceId }
}
