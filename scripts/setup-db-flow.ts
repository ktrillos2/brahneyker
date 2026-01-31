import { createClient } from "@libsql/client"
import * as dotenv from "dotenv"

dotenv.config({ path: '.env.local' })

const url = process.env.TURSO_DATABASE_URL || "libsql://website-rsusuarez.aws-us-east-1.turso.io"
const authToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJkNjJlMWYyNi1mMjFjLTRkNDQtYThhYi1jMzk5ZGQ3YzA3NWQiLCJpYXQiOjE3Njg1OTg1MTcsInJpZCI6IjhlZDMwZTcyLTEwZWMtNDlkYS05ODczLWFiYTFiMzM1NjM3YyJ9.lXGg3fo67mlSKlrcUvo_c1R3rU3XfiFHDv5B_7KhGyIIm7hf7_gBDcAL0ku2bfJ5Dibjr6esuReq91Thp-AHAA"

async function main() {
    const client = createClient({
        url,
        authToken,
    })

    console.log("--- 1. INSPECCIÓN ---")

    // Check tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
    const tableNames = tables.rows.map(r => r.name)
    console.log("Tables found:", tableNames)

    const targetTable = tableNames.includes('appointments') ? 'appointments' : 'citas'
    console.log(`Using target table: '${targetTable}' for appointments.`)

    const tableInfo = await client.execute(`PRAGMA table_info(${targetTable})`)
    console.log(`Schema for '${targetTable}':`)
    tableInfo.rows.forEach(r => {
        console.log(` - ${r.name} (${r.type})`)
    })

    console.log("\n--- 2. CREACIÓN DE TABLA DE ESTADO ---")
    const createStateTableSQL = `
    CREATE TABLE IF NOT EXISTS conversation_state (
        phone TEXT PRIMARY KEY,
        step TEXT DEFAULT 'IDLE',
        temp_data TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `
    await client.execute(createStateTableSQL)
    console.log("Table 'conversation_state' verified/created.")

    console.log("\n--- 3. ACTUALIZACIÓN DE TABLA CITAS (APPOINTMENTS) ---")
    // We map user requirements to existing English schema if possible
    // User wants: tipo_servicio, detalle_servicio, profesional, estado
    // Existing (likely): service_type?, details?, stylist, status

    const columns = tableInfo.rows.map(r => r.name as string)

    // Check/Add 'service_type' (tipo_servicio)
    if (!columns.includes('service_type') && !columns.includes('tipo_servicio')) {
        console.log("Adding column 'service_type'...")
        await client.execute(`ALTER TABLE ${targetTable} ADD COLUMN service_type TEXT`)
    } else {
        console.log("Column for service type already exists.")
    }

    // Check/Add 'service_detail' (detalle_servicio)
    // details exists, but might be for notes. Let's add service_detail for specificity
    if (!columns.includes('service_detail') && !columns.includes('detalle_servicio')) {
        console.log("Adding column 'service_detail'...")
        await client.execute(`ALTER TABLE ${targetTable} ADD COLUMN service_detail TEXT`)
    } else {
        console.log("Column for service detail already exists.")
    }

    // Check 'stylist' (profesional)
    if (columns.includes('stylist')) {
        console.log("Column 'stylist' exists (maps to 'profesional').")
    } else if (!columns.includes('profesional')) {
        console.log("Adding column 'stylist'...")
        await client.execute(`ALTER TABLE ${targetTable} ADD COLUMN stylist TEXT`)
    }

    console.log("\n--- 4. RESUMEN FINAL ---")
    const finalSchemaMain = await client.execute(`PRAGMA table_info(${targetTable})`)
    console.log(`Tabla '${targetTable}':`)
    finalSchemaMain.rows.forEach(r => console.log(` - ${r.name} (${r.type})`))

    const finalSchemaState = await client.execute(`PRAGMA table_info(conversation_state)`)
    console.log(`Tabla 'conversation_state':`)
    finalSchemaState.rows.forEach(r => console.log(` - ${r.name} (${r.type})`))
}

main()
