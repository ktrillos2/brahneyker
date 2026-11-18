"use server"

import { db } from "@/lib/db"
import { dailyClosures, dailyOperations, dailyProductSales, products } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/auth"
import { ensureClosuresTable } from "@/lib/closures"
import { todayInBogota } from "@/lib/dates"

// Closing the cash register of a day locks its services and product sales.
export async function closeDay(date: string) {
    await verifySession()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha inválida" }
    if (date > todayInBogota()) return { error: "No se puede cerrar la caja de un día que aún no llega" }

    try {
        await ensureClosuresTable()
        const [operations, sales] = await Promise.all([
            db.select({ amount: dailyOperations.amount }).from(dailyOperations).where(eq(dailyOperations.date, date)),
            db.select({ quantity: dailyProductSales.quantity, price: products.price })
                .from(dailyProductSales)
                .leftJoin(products, eq(dailyProductSales.productId, products.id))
                .where(eq(dailyProductSales.date, date)),
        ])
        const servicesTotal = operations.reduce((sum, op) => sum + op.amount, 0)
        const productsTotal = sales.reduce((sum, sale) => sum + sale.quantity * (sale.price || 0), 0)

        await db.insert(dailyClosures).values({ date, servicesTotal, productsTotal }).onConflictDoNothing()

        revalidatePath("/admin/dashboard/ingresos")
        revalidatePath("/admin/dashboard/daily-invoices")
        return { success: true }
    } catch (error) {
        console.error("Close day error:", error)
        return { error: "Error al cerrar la caja" }
    }
}
