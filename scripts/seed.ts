import { db } from "../lib/db"
import { users } from "../lib/schema"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

async function main() {
    console.log("Seeding database...")

    const username = "ruthsu87"
    const passwordRaw = "60390777"
    const passwordHash = await hash(passwordRaw, 10)

    // Check if admin exists
    const existingUser = await db.select().from(users).where(eq(users.username, username))

    if (existingUser.length === 0) {
        console.log("Creating admin user...")
        await db.insert(users).values({
            id: crypto.randomUUID(),
            username,
            password: passwordHash,
        })
        console.log("Admin user created.")
    } else {
        console.log("Admin user already exists. Updating password...")
        await db.update(users).set({ password: passwordHash }).where(eq(users.username, username))
        console.log("Admin password updated.")
    }

    console.log("Seeding completed.")
    process.exit(0)
}

main().catch((err) => {
    console.error("Seeding failed:", err)
    process.exit(1)
})
