import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

// Users Table (Admin)
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(), // Hashed
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Products Table (Inventory)
export const products = sqliteTable("products", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    price: real("price").notNull(),
    cost: real("cost").notNull(),
    quantity: integer("quantity").notNull(),
    minStock: integer("min_stock").notNull(),
    barcode: text("barcode").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Appointments Table
export const appointments = sqliteTable("appointments", {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // ISO Date String YYYY-MM-DD
    time: text("time").notNull(), // HH:MM
    duration: integer("duration").default(60), // in minutes
    details: text("details").notNull(),
    stylist: text("stylist").notNull(), // "Damaris" | "Fabiola"
    serviceType: text("service_type").default("Otro"),
    status: text("status").notNull().default("pendiente"), // "pendiente" | "confirmada" | "completada" | "cancelada"
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})
