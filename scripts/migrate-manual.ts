import { db } from "../lib/db"
import { sql } from "drizzle-orm"

async function main() {
    console.log("Running manual migration...")

    try {
        // Users
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
      );
    `)
        console.log("Created users table.")

        // Products
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        quantity INTEGER NOT NULL,
        min_stock INTEGER NOT NULL,
        barcode TEXT NOT NULL,
        created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
      );
    `)
        console.log("Created products table.")

        // Appointments
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER DEFAULT 60,
        details TEXT NOT NULL,
        stylist TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente',
        created_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
      );
    `)
        console.log("Created appointments table.")

        console.log("Migration completed.")
        process.exit(0)
    } catch (err) {
        console.error("Migration failed:", err)
        process.exit(1)
    }
}

main()
