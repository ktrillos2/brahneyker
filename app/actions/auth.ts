"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { compare } from "bcryptjs"
import { createSession, logout } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
        return { error: "Todos los campos son obligatorios" }
    }

    try {
        const user = await db.select().from(users).where(eq(users.username, username)).get()

        if (!user) {
            return { error: "Usuario no encontrado" }
        }

        const passwordsMatch = await compare(password, user.password)

        if (!passwordsMatch) {
            return { error: "Contraseña incorrecta" }
        }

        await createSession(user.id)
    } catch (error) {
        console.error("Login error:", error)
        return { error: "Error interno del servidor" }
    }

    redirect("/admin/dashboard/inventario")
}

export async function logoutAction() {
    await logout()
    redirect("/admin/login")
}
