"use server"

import { db } from "@/lib/db"
import { products } from "@/lib/schema"
import { eq, desc, like, or, sql } from "drizzle-orm"
import { verifySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getProducts(page = 1, pageSize = 10, query = "") {
    await verifySession()

    const offset = (page - 1) * pageSize

    const searchFilter = query
        ? or(
            like(products.name, `%${query}%`),
            like(products.barcode, `%${query}%`)
        )
        : undefined

    const [data, totalResult] = await Promise.all([
        db.select()
            .from(products)
            .where(searchFilter)
            .limit(pageSize)
            .offset(offset)
            .orderBy(desc(products.createdAt)),
        db.select({ count: sql<number>`count(*)` })
            .from(products)
            .where(searchFilter)
    ])

    const total = totalResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    return {
        products: data,
        total,
        totalPages,
        currentPage: page
    }
}

export async function createProduct(data: any) {
    await verifySession()

    try {
        // Check for duplicate barcode
        const existingProduct = await db.select()
            .from(products)
            .where(eq(products.barcode, data.barcode))
            .get()

        if (existingProduct) {
            return { error: "El código de barras ya existe" }
        }

        await db.insert(products).values({
            id: crypto.randomUUID(),
            name: data.name,
            description: data.description,
            category: data.category,
            price: Number(data.price),
            cost: Number(data.cost),
            quantity: Number(data.quantity),
            minStock: Number(data.minStock),
            barcode: data.barcode,
        })
        revalidatePath("/admin/dashboard/inventario")
        return { success: true }
    } catch (error) {
        console.error("Create product error:", error)
        return { error: "Error al crear producto" }
    }
}

export async function updateProduct(id: string, data: any) {
    await verifySession()

    try {
        // Check for duplicate barcode (excluding current product)
        const existingProduct = await db.select()
            .from(products)
            .where(sql`${products.barcode} = ${data.barcode} AND ${products.id} != ${id}`)
            .get()

        if (existingProduct) {
            return { error: "El código de barras ya existe" }
        }

        await db.update(products).set({
            name: data.name,
            description: data.description,
            category: data.category,
            price: Number(data.price),
            cost: Number(data.cost),
            quantity: Number(data.quantity),
            minStock: Number(data.minStock),
            barcode: data.barcode,
        }).where(eq(products.id, id))
        revalidatePath("/admin/dashboard/inventario")
        return { success: true }
    } catch (error) {
        console.error("Update product error:", error)
        return { error: "Error al actualizar producto" }
    }
}

export async function deleteProduct(id: string) {
    await verifySession()

    try {
        await db.delete(products).where(eq(products.id, id))
        revalidatePath("/admin/dashboard/inventario")
        return { success: true }
    } catch (error) {
        console.error("Delete product error:", error)
        return { error: "Error al eliminar producto" }
    }
}

export async function getCategories() {
    await verifySession()
    try {
        const result = await db.selectDistinct({ category: products.category }).from(products)
        return result.map(r => r.category).filter(Boolean).sort()
    } catch (error) {
        console.error("Get categories error:", error)
        return []
    }
}
