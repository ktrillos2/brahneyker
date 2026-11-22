"use server"

import { db } from "@/lib/db"
import { dailyClosures, dailyOperations, dailyProductSales, products } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { addDays, format, parseISO } from "date-fns"
import { verifySession } from "@/lib/auth"
import { ensureClosuresTable } from "@/lib/closures"
import { todayInBogota } from "@/lib/dates"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Stores the day's totals at closing time; an existing closure is left untouched.
async function closeOne(date: string) {
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
}

function revalidateClosureViews() {
    revalidatePath("/admin/dashboard/ingresos")
    revalidatePath("/admin/dashboard/daily-invoices")
}

// Closing the cash register of a day: later changes to it require a reason and are recorded.
export async function closeDay(date: string) {
    await verifySession()
    if (!DATE_PATTERN.test(date)) return { error: "Fecha inválida" }
    if (date > todayInBogota()) return { error: "No se puede cerrar la caja de un día que aún no llega" }

    try {
        await ensureClosuresTable()
        await closeOne(date)
        revalidateClosureViews()
        return { success: true }
    } catch (error) {
        console.error("Close day error:", error)
        return { error: "Error al cerrar la caja" }
    }
}

// Closes every day of the week (Monday to Sunday) up to today.
export async function closeWeek(weekStart: string) {
    await verifySession()
    if (!DATE_PATTERN.test(weekStart)) return { error: "Fecha inválida" }

    const today = todayInBogota()
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"))
        .filter((day) => day <= today)
    if (days.length === 0) return { error: "No se puede cerrar la caja de una semana que aún no llega" }

    try {
        await ensureClosuresTable()
        for (const day of days) await closeOne(day)
        revalidateClosureViews()
        return { success: true, closedDays: days.length }
    } catch (error) {
        console.error("Close week error:", error)
        return { error: "Error al cerrar la caja de la semana" }
    }
}
