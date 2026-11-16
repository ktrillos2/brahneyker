"use server"

import { db } from "@/lib/db"
import { employees } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { ensureEmployeesTable, listEmployees } from "@/lib/employees"

function revalidateEmployeeViews() {
    revalidatePath("/admin/dashboard/empleadas")
    revalidatePath("/admin/dashboard/citas")
    revalidatePath("/admin/dashboard/daily-invoices")
    revalidatePath("/admin/dashboard/ingresos")
}

async function nameTaken(name: string, exceptId?: string) {
    const rows = await db.select({ id: employees.id })
        .from(employees)
        .where(sql`lower(${employees.name}) = lower(${name})`)
    return rows.some((r) => r.id !== exceptId)
}

export async function getEmployees(onlyActive = false) {
    await verifySession()
    return listEmployees(onlyActive)
}

export async function createEmployee(rawName: string) {
    await verifySession()
    const name = rawName.trim()
    if (!name) return { error: "Escribe el nombre de la empleada" }

    try {
        await ensureEmployeesTable()
        if (await nameTaken(name)) return { error: "Ya existe una empleada con ese nombre" }

        const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`coalesce(max(${employees.sortOrder}), -1)` }).from(employees)
        await db.insert(employees).values({ id: crypto.randomUUID(), name, sortOrder: maxOrder + 1 })
        revalidateEmployeeViews()
        return { success: true }
    } catch (error) {
        console.error("Create employee error:", error)
        return { error: "Error al crear empleada" }
    }
}

export async function moveEmployee(id: string, direction: -1 | 1) {
    await verifySession()
    try {
        const list = await listEmployees()
        const index = list.findIndex((e) => e.id === id)
        const target = index + direction
        if (index === -1 || target < 0 || target >= list.length) return { success: true }

        const reordered = [...list]
        ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
        await db.batch(reordered.map((e, i) =>
            db.update(employees).set({ sortOrder: i }).where(eq(employees.id, e.id))
        ) as [any, ...any[]])
        revalidateEmployeeViews()
        return { success: true }
    } catch (error) {
        console.error("Move employee error:", error)
        return { error: "Error al reordenar" }
    }
}

// Past appointments and services keep the employee's name, so deleting does not erase history.
export async function deleteEmployee(id: string) {
    await verifySession()
    try {
        await ensureEmployeesTable()
        await db.delete(employees).where(eq(employees.id, id))
        revalidateEmployeeViews()
        return { success: true }
    } catch (error) {
        console.error("Delete employee error:", error)
        return { error: "Error al eliminar empleada" }
    }
}
