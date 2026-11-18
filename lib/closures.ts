import { db } from "@/lib/db"
import { dailyClosures } from "@/lib/schema"
import { and, gte, inArray, lte, sql } from "drizzle-orm"

let ensured: Promise<void> | null = null

// The daily_closures table is newer than the production database, so create it on first use.
export function ensureClosuresTable() {
    ensured ??= db.run(sql`CREATE TABLE IF NOT EXISTS daily_closures (
        date text PRIMARY KEY NOT NULL,
        services_total real NOT NULL,
        products_total real NOT NULL,
        closed_at text DEFAULT (CURRENT_TIMESTAMP)
    )`).then(() => undefined).catch((error) => {
        ensured = null
        throw error
    })
    return ensured
}

export async function getClosure(date: string) {
    await ensureClosuresTable()
    return (await db.select().from(dailyClosures).where(inArray(dailyClosures.date, [date])))[0] ?? null
}

export async function getClosuresBetween(startDate: string, endDate: string) {
    await ensureClosuresTable()
    return db.select().from(dailyClosures)
        .where(and(gte(dailyClosures.date, startDate), lte(dailyClosures.date, endDate)))
}

export class ClosedDayError extends Error {}

// Throws when any of the dates has its cash register closed.
export async function assertDaysOpen(dates: string[]) {
    const unique = [...new Set(dates)]
    if (unique.length === 0) return
    await ensureClosuresTable()
    const closed = await db.select({ date: dailyClosures.date }).from(dailyClosures)
        .where(inArray(dailyClosures.date, unique))
    if (closed.length > 0) {
        throw new ClosedDayError(`La caja del ${closed[0].date} ya está cerrada y no se puede modificar.`)
    }
}
