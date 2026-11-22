"use server"

import { db } from "@/lib/db"
import { dailyOperations, dailyProductSales, invoices, invoiceItems, products } from "@/lib/schema"
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { ClosedDayError, guardClosedDays } from "@/lib/closures"
import { verifySession } from "@/lib/auth"

function revalidateDailyViews() {
    revalidatePath("/admin/dashboard/daily-invoices")
    revalidatePath("/admin/daily-invoices")
    revalidatePath("/admin/dashboard/ingresos")
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof ClosedDayError ? error.message : fallback
}

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

async function saleRows(ids: string[]) {
    if (ids.length === 0) return []
    return db.select({ id: dailyProductSales.id, date: dailyProductSales.date, quantity: dailyProductSales.quantity, status: dailyProductSales.status, name: products.name })
        .from(dailyProductSales)
        .leftJoin(products, eq(dailyProductSales.productId, products.id))
        .where(inArray(dailyProductSales.id, ids))
}

// Daily Operations (Services)
// `reason` is required only when the day's cash register is closed (see guardClosedDays).

export async function addDailyOperation(data: {
    stylist: string
    clientName?: string
    description: string
    amount: number
    date: string
}, reason?: string) {
    try {
        const newRecord = {
            id: crypto.randomUUID(),
            stylist: data.stylist,
            clientName: data.clientName?.trim() || null,
            description: data.description.trim(),
            amount: data.amount,
            date: data.date,
            status: "pendiente",
        }
        await guardClosedDays([data.date], reason,
            () => `Agregó servicio de ${data.stylist} por ${money(data.amount)}`,
            (tx) => tx.insert(dailyOperations).values(newRecord))
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

export async function deleteDailyOperation(id: string, reason?: string) {
    return deleteDailyOperations([id], reason)
}

export async function deleteDailyOperations(ids: string[], reason?: string) {
    if (ids.length === 0) return { success: true }
    try {
        const ops = await db.select().from(dailyOperations).where(inArray(dailyOperations.id, ids))
        await guardClosedDays(ops.map((op) => op.date), reason,
            (date) => "Eliminó " + ops.filter((op) => op.date === date).map((op) => `servicio de ${op.stylist} por ${money(op.amount)}`).join(", "),
            (tx) => tx.delete(dailyOperations).where(inArray(dailyOperations.id, ids)))
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
}, reason?: string) {
    try {
        const op = await db.select().from(dailyOperations).where(eq(dailyOperations.id, id)).get()
        if (!op) return { success: false, error: "El servicio ya no existe" }
        await guardClosedDays([op.date], reason,
            () => `Cambió servicio de ${op.stylist} de ${money(op.amount)} a ${data.stylist} por ${money(data.amount)}`,
            (tx) => tx.update(dailyOperations).set(data).where(eq(dailyOperations.id, id)))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error updating daily operation:", error)
        return { success: false, error: errorMessage(error, "Error al actualizar servicio. Verifique la conexión o contacte soporte.") }
    }
}

// Daily Product Sales

export async function addDailyProductSale(data: {
    productId: string
    quantity: number
    date: string
}, reason?: string) {
    try {
        const product = await db.select({ name: products.name }).from(products).where(eq(products.id, data.productId)).get()
        await guardClosedDays([data.date], reason,
            () => `Agregó venta: ${product?.name ?? "producto"} ×${data.quantity}`,
            (tx) => tx.insert(dailyProductSales).values({
                id: crypto.randomUUID(),
                ...data,
                status: "pendiente",
            }))
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

export async function deleteDailyProductSale(id: string, reason?: string) {
    return deleteDailyProductSales([id], reason)
}

export async function deleteDailyProductSales(ids: string[], reason?: string) {
    if (ids.length === 0) return { success: true }
    try {
        const sales = await saleRows(ids)
        await guardClosedDays(sales.map((sale) => sale.date), reason,
            (date) => "Eliminó venta: " + sales.filter((sale) => sale.date === date).map((sale) => `${sale.name ?? "producto"} ×${sale.quantity}`).join(", "),
            (tx) => tx.delete(dailyProductSales).where(inArray(dailyProductSales.id, ids)))
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error deleting daily product sales:", error)
        return { success: false, error: errorMessage(error, "Error al eliminar venta") }
    }
}

// Draft changes made in Ingresos' edit mode, saved together in one transaction.
export interface DayChanges {
    adds: { stylist: string; amount: number }[]
    updates: { id: string; amount: number }[]
    deletes: string[]
    saleAdds: { productId: string; quantity: number }[]
    saleDeletes: string[]
}

export async function applyDayChanges(date: string, changes: DayChanges, reason?: string) {
    await verifySession()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "Fecha inválida" }
    if (changes.adds.some((a) => !a.stylist || !(a.amount > 0)) || changes.updates.some((u) => !(u.amount > 0))) {
        return { success: false, error: "Todos los valores deben ser mayores a 0" }
    }
    if (changes.saleAdds.some((s) => !s.productId || !Number.isInteger(s.quantity) || s.quantity < 1)) {
        return { success: false, error: "La cantidad de cada producto debe ser 1 o más" }
    }

    try {
        const opIds = [...new Set([...changes.updates.map((u) => u.id), ...changes.deletes])]
        const [ops, sales, addedProducts] = await Promise.all([
            opIds.length ? db.select().from(dailyOperations).where(inArray(dailyOperations.id, opIds)) : Promise.resolve([]),
            saleRows(changes.saleDeletes),
            changes.saleAdds.length
                ? db.select({ id: products.id, name: products.name }).from(products)
                    .where(inArray(products.id, changes.saleAdds.map((s) => s.productId)))
                : Promise.resolve([]),
        ])
        const opById = new Map(ops.map((op) => [op.id, op]))

        // Only pending records of this same day can be changed; the draft may be stale.
        const invalidOp = opIds.find((id) => {
            const op = opById.get(id)
            return !op || op.date !== date || op.status === "facturada"
        })
        const invalidSale = new Set(changes.saleDeletes).size !== sales.length
            || sales.some((sale) => sale.date !== date || sale.status === "facturada")
        if (invalidOp || invalidSale) {
            return { success: false, error: "Algunos registros del borrador ya no existen o ya fueron facturados. Descarta el borrador y vuelve a intentarlo." }
        }
        if (addedProducts.length !== new Set(changes.saleAdds.map((s) => s.productId)).size) {
            return { success: false, error: "Algún producto del borrador ya no existe" }
        }

        const productName = new Map(addedProducts.map((p) => [p.id, p.name]))
        const lines = [
            ...changes.adds.map((a) => `Agregó servicio de ${a.stylist} por ${money(a.amount)}`),
            ...changes.updates.map((u) => {
                const op = opById.get(u.id)!
                return `Cambió servicio de ${op.stylist} de ${money(op.amount)} a ${money(u.amount)}`
            }),
            ...changes.deletes.map((id) => {
                const op = opById.get(id)!
                return `Eliminó servicio de ${op.stylist} por ${money(op.amount)}`
            }),
            ...changes.saleAdds.map((s) => `Agregó venta: ${productName.get(s.productId)} ×${s.quantity}`),
            ...sales.map((sale) => `Eliminó venta: ${sale.name ?? "producto"} ×${sale.quantity}`),
        ]
        if (lines.length === 0) return { success: true }

        await guardClosedDays([date], reason, () => lines.join(" · "), async (tx) => {
            if (changes.adds.length) {
                await tx.insert(dailyOperations).values(changes.adds.map((a) => ({
                    id: crypto.randomUUID(),
                    stylist: a.stylist,
                    clientName: null,
                    description: "Servicio",
                    amount: a.amount,
                    date,
                    status: "pendiente",
                })))
            }
            for (const u of changes.updates) {
                await tx.update(dailyOperations).set({ amount: u.amount }).where(eq(dailyOperations.id, u.id))
            }
            if (changes.deletes.length) {
                await tx.delete(dailyOperations).where(inArray(dailyOperations.id, changes.deletes))
            }
            if (changes.saleAdds.length) {
                await tx.insert(dailyProductSales).values(changes.saleAdds.map((s) => ({
                    id: crypto.randomUUID(),
                    productId: s.productId,
                    quantity: s.quantity,
                    date,
                    status: "pendiente",
                })))
            }
            if (changes.saleDeletes.length) {
                await tx.delete(dailyProductSales).where(inArray(dailyProductSales.id, changes.saleDeletes))
            }
        })
        revalidateDailyViews()
        return { success: true }
    } catch (error) {
        console.error("Error applying day changes:", error)
        return { success: false, error: errorMessage(error, "Error al guardar los cambios") }
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
