export const invoices = sqliteTable("invoices", {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    subtotal: real("subtotal").notNull(),
    total: real("total").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const invoiceItems = sqliteTable("invoice_items", {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    productId: text("product_id").notNull().references(() => products.id),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(),
})
