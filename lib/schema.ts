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
    status: text("status").notNull().default("pendiente"), // "pendiente" | "confirmada" | "completada" | "cancelada"
    clientName: text("client_name"),
    clientPhone: text("client_phone"),
    serviceType: text("service_type"),
    serviceDetail: text("service_detail"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Conversation State Table (Bot Flow)
export const conversationState = sqliteTable("conversation_state", {
    phone: text("phone").primaryKey(),
    step: text("step").default('IDLE'), // 'SERVICE_SELECTION', 'NAIL_TYPE', 'PROFESSIONAL', 'DATE_TIME'
    tempData: text("temp_data"), // JSON string
    lastUpdated: text("last_updated").default(sql`(CURRENT_TIMESTAMP)`),
})

// Invoices Table
export const invoices = sqliteTable("invoices", {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    subtotal: real("subtotal").notNull(),
    total: real("total").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Invoice Items Table
export const invoiceItems = sqliteTable("invoice_items", {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    productId: text("product_id").notNull().references(() => products.id),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(),
})

