import { db } from "@/lib/db"
import { closureEdits, dailyClosures } from "@/lib/schema"
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm"

let ensured: Promise<void> | null = null

// The daily_closures and closure_edits tables are newer than the production database, so create them on first use.
export function ensureClosuresTable() {
    ensured ??= db.batch([
        db.run(sql`CREATE TABLE IF NOT EXISTS daily_closures (
            date text PRIMARY KEY NOT NULL,
            services_total real NOT NULL,
            products_total real NOT NULL,
            closed_at text DEFAULT (CURRENT_TIMESTAMP)
        )`),
        db.run(sql`CREATE TABLE IF NOT EXISTS closure_edits (
            id text PRIMARY KEY NOT NULL,
            date text NOT NULL,
            description text NOT NULL,
            reason text NOT NULL,
            created_at text DEFAULT (CURRENT_TIMESTAMP)
        )`),
    ]).then(() => undefined).catch((error) => {
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

export async function getClosureEdits(date: string) {
    await ensureClosuresTable()
    return db.select().from(closureEdits).where(eq(closureEdits.date, date)).orderBy(asc(closureEdits.createdAt))
}

export class ClosedDayError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const displayDate = (date: string) => date.split("-").reverse().join("/")

// Changes to a closed day are allowed only with a reason, and each one is recorded.
// `describe` gives the log line for each closed date touched by the change.
export async function guardClosedDays(
    dates: string[],
    reason: string | undefined,
    describe: (date: string) => string,
    mutate: (tx: Tx) => Promise<unknown>,
) {
    const unique = [...new Set(dates)]
    await ensureClosuresTable()
    const closed = unique.length === 0 ? [] : (await db.select({ date: dailyClosures.date }).from(dailyClosures)
        .where(inArray(dailyClosures.date, unique))).map((c) => c.date)
    const why = reason?.trim()

    if (closed.length > 0 && !why) {
        throw new ClosedDayError(`La caja del ${displayDate(closed[0])} está cerrada. Para modificarla escribe el motivo del cambio desde Ingresos.`)
    }

    await db.transaction(async (tx) => {
        await mutate(tx)
        if (closed.length > 0 && why) {
            await tx.insert(closureEdits).values(closed.map((date) => ({
                id: crypto.randomUUID(),
                date,
                description: describe(date),
                reason: why,
            })))
        }
    })
}
