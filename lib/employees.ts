import { db } from "@/lib/db"
import { employees } from "@/lib/schema"
import { asc, eq, sql } from "drizzle-orm"

// Stylists that existed before employees were stored in the database.
const DEFAULT_EMPLOYEES = ["Damaris", "Fabiola", "Stefanny", "Lizday", "Stella", "Anyeli"]

let ensured: Promise<void> | null = null

// The employees table is newer than the production database, so create and seed it on first use.
export function ensureEmployeesTable() {
    ensured ??= (async () => {
        await db.run(sql`CREATE TABLE IF NOT EXISTS employees (
            id text PRIMARY KEY NOT NULL,
            name text NOT NULL UNIQUE,
            active integer DEFAULT 1 NOT NULL,
            sort_order integer DEFAULT 0 NOT NULL,
            created_at text DEFAULT (CURRENT_TIMESTAMP)
        )`)
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(employees)
        if (count === 0) {
            await db.insert(employees)
                .values(DEFAULT_EMPLOYEES.map((name, i) => ({ id: crypto.randomUUID(), name, sortOrder: i })))
                .onConflictDoNothing()
        }
    })().catch((error) => {
        ensured = null
        throw error
    })
    return ensured
}

export async function listEmployees(onlyActive = false) {
    await ensureEmployeesTable()
    const query = db.select().from(employees).orderBy(asc(employees.sortOrder), asc(employees.createdAt))
    return onlyActive ? query.where(eq(employees.active, true)) : query
}

export async function getActiveEmployeeNames() {
    return (await listEmployees(true)).map((e) => e.name)
}
