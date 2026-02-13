import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

async function main() {
    console.log("Starting manual migration...")

    try {
        // SQL from drizzle/0001_chubby_power_pack.sql
        // We will execute them one by one.

        console.log("Creating conversation_state table...")
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS conversation_state (
                phone text PRIMARY KEY NOT NULL,
                step text DEFAULT 'IDLE',
                temp_data text,
                last_updated text DEFAULT (CURRENT_TIMESTAMP)
            );
        `)

        console.log("Creating daily_operations table...")
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS daily_operations (
                id text PRIMARY KEY NOT NULL,
                date text NOT NULL,
                stylist text NOT NULL,
                client_name text,
                description text NOT NULL,
                amount real NOT NULL,
                status text DEFAULT 'pendiente' NOT NULL,
                invoice_id text,
                created_at text DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE no action
            );
        `)

        console.log("Creating daily_product_sales table...")
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS daily_product_sales (
                id text PRIMARY KEY NOT NULL,
                date text NOT NULL,
                product_id text NOT NULL,
                quantity integer NOT NULL,
                status text DEFAULT 'pendiente' NOT NULL,
                invoice_id text,
                created_at text DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE no action
            );
        `)

        console.log("Adding columns to appointments...")
        try {
            await db.run(sql`ALTER TABLE appointments ADD client_name text;`)
            console.log("- Added client_name")
        } catch (e) {
            console.log("- client_name might already exist")
        }
        try {
            await db.run(sql`ALTER TABLE appointments ADD client_phone text;`)
            console.log("- Added client_phone")
        } catch (e) {
            console.log("- client_phone might already exist")
        }
        try {
            await db.run(sql`ALTER TABLE appointments ADD service_type text;`)
            console.log("- Added service_type")
        } catch (e) {
            console.log("- service_type might already exist")
        }
        try {
            await db.run(sql`ALTER TABLE appointments ADD service_detail text;`)
            console.log("- Added service_detail")
        } catch (e) {
            console.log("- service_detail might already exist")
        }

        console.log("Adding type column to invoices...")
        try {
            await db.run(sql`ALTER TABLE invoices ADD type text DEFAULT 'general' NOT NULL;`)
            console.log("- Added type")
        } catch (e) {
            console.log("- type might already exist")
        }

        console.log("Migration completed successfully!")

    } catch (error) {
        console.error("Migration failed:", error)
    }
}

main()
