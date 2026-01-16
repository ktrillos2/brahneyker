import { createClient } from "@libsql/client"

const url = "libsql://website-rsusuarez.aws-us-east-1.turso.io"
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJkNjJlMWYyNi1mMjFjLTRkNDQtYThhYi1jMzk5ZGQ3YzA3NWQiLCJpYXQiOjE3Njg1OTg1MTcsInJpZCI6IjhlZDMwZTcyLTEwZWMtNDlkYS05ODczLWFiYTFiMzM1NjM3YyJ9.lXGg3fo67mlSKlrcUvo_c1R3rU3XfiFHDv5B_7KhGyIIm7hf7_gBDcAL0ku2bfJ5Dibjr6esuReq91Thp-AHAA"

const sql = `
CREATE TABLE IF NOT EXISTS \`appointments\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`date\` text NOT NULL,
	\`time\` text NOT NULL,
	\`duration\` integer DEFAULT 60,
	\`details\` text NOT NULL,
	\`stylist\` text NOT NULL,
	\`status\` text DEFAULT 'pendiente' NOT NULL,
	\`created_at\` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS \`invoice_items\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`invoice_id\` text NOT NULL,
	\`product_id\` text NOT NULL,
	\`product_name\` text NOT NULL,
	\`quantity\` integer NOT NULL,
	\`price\` real NOT NULL,
	FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS \`invoices\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`date\` text NOT NULL,
	\`customer_name\` text,
	\`customer_phone\` text,
	\`subtotal\` real NOT NULL,
	\`total\` real NOT NULL,
	\`created_at\` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS \`products\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`description\` text NOT NULL,
	\`category\` text NOT NULL,
	\`price\` real NOT NULL,
	\`cost\` real NOT NULL,
	\`quantity\` integer NOT NULL,
	\`min_stock\` integer NOT NULL,
	\`barcode\` text NOT NULL,
	\`created_at\` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`username\` text NOT NULL,
	\`password\` text NOT NULL,
	\`created_at\` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_unique\` ON \`users\` (\`username\`);
`

async function main() {
    const client = createClient({
        url,
        authToken,
    })

    // Split by semicolon (roughly) or just execute block if supported, 
    // but libSQL execute usually takes one statement. 
    // However, createClient allows executeMultiple usually?
    // Let's split manually to be safe.

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const st of statements) {
        try {
            console.log("Executing:", st.substring(0, 50) + "...")
            await client.execute(st)
            console.log("Success")
        } catch (e: any) {
            if (e.message?.includes('already exists')) {
                console.log("Table/Index already exists, skipping.")
            } else {
                console.error("Error executing statement:", e)
            }
        }
    }
}

main()
