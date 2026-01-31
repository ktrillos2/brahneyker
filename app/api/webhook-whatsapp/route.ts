import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/schema'
import { eq, and, not } from 'drizzle-orm'

// Helper to send message to Gateway
async function sendToGateway(phone: string, message: string) {
    console.log(`Sending message to ${phone}: ${message}`)
    try {
        const response = await fetch("http://3.144.72.209:3000/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone,
                message,
                secret: "KYT_SECRET_2026"
            })
        })

        if (!response.ok) {
            console.error(`Gateway error: ${response.status} ${response.statusText}`)
        }
    } catch (error) {
        console.error("Error sending to gateway:", error)
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { phone, text, name } = body

        if (!phone || !text) {
            return NextResponse.json({ error: "Missing phone or text" }, { status: 400 })
        }

        const normalizedText = text.toLowerCase().trim()
        let responseMessage = ""

        if (normalizedText.includes("hola")) {
            responseMessage = `Hola ${name || "cliente"}, bienvenido a K&T. Ofrecemos cortes, tintes y tratamientos.`
        } else if (normalizedText.includes("agendar")) {
            // "Mañana a las 3PM" logic
            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(now.getDate() + 1)
            // Hardcode 3PM for testing as requested
            const targetHour = 15
            const targetMin = 0

            // Format date for DB: YYYY-MM-DD
            const year = tomorrow.getFullYear()
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
            const day = String(tomorrow.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}` // "2026-02-01"

            // Format time for DB: HH:MM
            const timeStr = `${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}` // "15:00"

            console.log(`Checking availability for: ${dateStr} at ${timeStr}`)

            // Check availability for BOTH stylists
            const stylists = ["Damaris", "Fabiola"]
            let availableStylist = null

            for (const stylist of stylists) {
                // Check if this stylist has an appointment at this date/time
                // We assume 1 hour duration by default for checking overlap simple exact match
                // More complex overlap logic would be needed for production
                const conflicts = await db.select()
                    .from(appointments)
                    .where(
                        and(
                            eq(appointments.date, dateStr),
                            eq(appointments.time, timeStr),
                            eq(appointments.stylist, stylist),
                            not(eq(appointments.status, 'cancelada'))
                        )
                    )

                if (conflicts.length === 0) {
                    availableStylist = stylist
                    break // Found one!
                }
            }

            if (availableStylist) {
                // Free slot found
                console.log(`Slot available with ${availableStylist}. Creating appointment...`)

                await db.insert(appointments).values({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    time: timeStr,
                    duration: 60, // Default 1h
                    details: "Agendado por WhatsApp Bot",
                    stylist: availableStylist,
                    status: "confirmada",
                    clientName: name || "WhatsApp User",
                    clientPhone: phone
                })

                responseMessage = `Cita confirmada para mañana a las 3:00 PM con ${availableStylist}.`
            } else {
                // All occupied
                console.log("Slot occupied for all stylists.")
                responseMessage = `Lo siento, no hay disponibilidad para mañana a las 3:00 PM con ninguno de nuestros estilistas.`
            }
        } else {
            responseMessage = `No entendí tu mensaje. Escribe "hola" para ver servicios o "agendar" para una cita.`
        }

        // Send response to Gateway
        await sendToGateway(phone, responseMessage)

        return NextResponse.json({ status: "success", message: responseMessage })
    } catch (error) {
        console.error("Webhook processing error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
