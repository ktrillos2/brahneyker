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
    stylist: text("stylist").notNull(), // employees.name
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
    type: text("type").notNull().default("general"), // "general" | "diaria-servicios" | "diaria-productos"
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Invoice Items Table
export const invoiceItems = sqliteTable("invoice_items", {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    productId: text("product_id").references(() => products.id, { onDelete: 'set null' }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(),
})

// Daily Operations Table (Services by Staff)
export const dailyOperations = sqliteTable("daily_operations", {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    stylist: text("stylist").notNull(), // employees.name
    clientName: text("client_name"),
    description: text("description").notNull(),
    amount: real("amount").notNull(),
    status: text("status").notNull().default("pendiente"), // "pendiente" | "facturada"
    invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: 'set null' }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Daily Product Sales Table
export const dailyProductSales = sqliteTable("daily_product_sales", {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    productId: text("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("pendiente"), // "pendiente" | "facturada"
    invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: 'set null' }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})


// Employees Table (stylists shown in calendar, daily billing, income and WhatsApp bot)
export const employees = sqliteTable("employees", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Daily Closures Table (a closed day can no longer be edited)
export const dailyClosures = sqliteTable("daily_closures", {
    date: text("date").primaryKey(), // YYYY-MM-DD
    servicesTotal: real("services_total").notNull(),
    productsTotal: real("products_total").notNull(),
    closedAt: text("closed_at").default(sql`(CURRENT_TIMESTAMP)`),
})

// Changes made to a day after its cash register was closed, with the mandatory reason
export const closureEdits = sqliteTable("closure_edits", {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD of the closed day
    description: text("description").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})
