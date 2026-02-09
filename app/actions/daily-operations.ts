"use server"

import { db } from "@/lib/db"
import { dailyOperations, dailyProductSales, invoices, invoiceItems, products } from "@/lib/schema"
import { eq, and, sql, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Daily Operations (Services)

export async function addDailyOperation(data: {
    stylist: string
    description: string
    amount: number
    date: string
}) {
    await db.insert(dailyOperations).values({
        id: crypto.randomUUID(),
        ...data,
        status: "pendiente",
    })
    revalidatePath("/admin/daily-invoices")
}

export async function getDailyOperations(date: string) {
    return await db.select().from(dailyOperations).where(eq(dailyOperations.date, date))
}

export async function deleteDailyOperation(id: string) {
    await db.delete(dailyOperations).where(eq(dailyOperations.id, id))
    revalidatePath("/admin/daily-invoices")
}

// Daily Product Sales

export async function addDailyProductSale(data: {
    productId: string
    quantity: number
    date: string
}) {
    await db.insert(dailyProductSales).values({
        id: crypto.randomUUID(),
        ...data,
        status: "pendiente",
    })
    revalidatePath("/admin/daily-invoices")
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
    await db.delete(dailyProductSales).where(eq(dailyProductSales.id, id))
    revalidatePath("/admin/daily-invoices")
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
                date: date,
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
                date: date,
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
            }

            await db.update(dailyProductSales)
                .set({ status: "facturada", invoiceId: productInvoiceId })
                .where(inArray(dailyProductSales.id, productSaleIds))
        }
    }

    revalidatePath("/admin/daily-invoices")
    revalidatePath("/admin/dashboard/facturas")

    if (!serviceInvoiceId && !productInvoiceId) {
        return { success: false, error: "No items selected" }
    }

    return { success: true, serviceInvoiceId, productInvoiceId }
}
