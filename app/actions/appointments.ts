"use server"

import { db } from "@/lib/db"
import { appointments } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getAppointments() {
    // Public access for now to let anyone view? No, usually admin only.
    // But maybe for checking availability?
    // Let's assume admin only for full list management.
    await verifySession()
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt))
}

export async function createAppointment(data: any) {
    await verifySession()

    try {
        await db.insert(appointments).values({
            id: crypto.randomUUID(),
            date: data.date,
            time: data.time,
            duration: Number(data.duration),
            details: data.details,
            stylist: data.stylist,
            status: "pendiente",
        })
        revalidatePath("/admin/dashboard/citas")
        return { success: true }
    } catch (error) {
        console.error("Create appointment error:", error)
        return { error: "Error al crear cita" }
    }
}

export async function updateAppointment(id: string, data: any) {
    await verifySession()

    try {
        await db.update(appointments).set({
            date: data.date,
            time: data.time,
            duration: Number(data.duration),
            details: data.details,
            stylist: data.stylist,
            // Status update might be separate or part of this
            ...(data.status ? { status: data.status } : {})
        }).where(eq(appointments.id, id))
        revalidatePath("/admin/dashboard/citas")
        return { success: true }
    } catch (error) {
        console.error("Update appointment error:", error)
        return { error: "Error al actualizar cita" }
    }
}

export async function updateAppointmentStatus(id: string, status: string) {
    await verifySession()
    try {
        await db.update(appointments).set({ status }).where(eq(appointments.id, id))
        revalidatePath("/admin/dashboard/citas")
        return { success: true }
    } catch (error) {
        return { error: "Error al actualizar estado" }
    }
}

export async function deleteAppointment(id: string) {
    await verifySession()

    try {
        await db.delete(appointments).where(eq(appointments.id, id))
        revalidatePath("/admin/dashboard/citas")
        return { success: true }
    } catch (error) {
        console.error("Delete appointment error:", error)
        return { error: "Error al eliminar cita" }
    }
}
