import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, conversationState } from '@/lib/schema'
import { eq, and, not } from 'drizzle-orm'
import * as chrono from 'chrono-node'

// --- Types & Interfaces ---

type ChatState = 'IDLE' | 'SERVICE_SELECTION' | 'NAIL_TYPE' | 'PROFESSIONAL' | 'DATE_TIME'

interface TempData {
    service_type?: string
    service_detail?: string
    stylist?: string
}

const GATEWAY_URL = "http://3.144.72.209:3000/send-message"
const GATEWAY_SECRET = "KYT_SECRET_2026"

// --- Helper Functions ---

async function sendToGateway(phone: string, message: string) {
    console.log(`[Gateway] Sending to ${phone}: ${message}`)
    try {
        const response = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone,
                message,
                secret: GATEWAY_SECRET
            })
        })

        if (!response.ok) {
            console.error(`[Gateway] Error: ${response.status} ${response.statusText}`)
        }
    } catch (error) {
        console.error("[Gateway] Network error:", error)
    }
}

async function getState(phone: string) {
    const records = await db.select().from(conversationState).where(eq(conversationState.phone, phone))
    if (records.length === 0) return null
    return records[0]
}

async function updateState(phone: string, step: ChatState, tempData?: TempData) {
    const existing = await getState(phone)
    if (existing) {
        await db.update(conversationState).set({
            step,
            tempData: JSON.stringify(tempData || {}),
            lastUpdated: new Date().toISOString() // Using ISO string for text column
        }).where(eq(conversationState.phone, phone))
    } else {
        await db.insert(conversationState).values({
            phone,
            step,
            tempData: JSON.stringify(tempData || {}),
            lastUpdated: new Date().toISOString()
        })
    }
}

async function clearState(phone: string) {
    await db.delete(conversationState).where(eq(conversationState.phone, phone))
}

// --- Main Handler ---

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { phone, text, name } = body

        if (!phone || !text) {
            return NextResponse.json({ error: "Missing phone or text" }, { status: 400 })
        }

        const input = text.trim()
        const inputLower = input.toLowerCase()
        const userName = name || "Cliente"

        // 1. Get current state
        let currentStateRecord = await getState(phone)
        let currentStep: ChatState = (currentStateRecord?.step as ChatState) || 'IDLE'
        let currentTempData: TempData = currentStateRecord?.tempData ? JSON.parse(currentStateRecord.tempData) : {}

        console.log(`[Bot] Phone: ${phone}, Step: ${currentStep}, Input: "${input}"`)

        // --- STATE MACHINE ---

        switch (currentStep) {
            case 'IDLE':
                // Trigger: Any greeting or "agendar"
                // Action: Welcome & Menu
                const welcomeMsg = `¡Hola ${userName}! Bienvenido a Brahneyker 💅.\n¿Qué deseas agendar hoy?\n\n1. Uñas\n2. Otro Tratamiento`
                await sendToGateway(phone, welcomeMsg)
                await updateState(phone, 'SERVICE_SELECTION', {})
                break;

            case 'SERVICE_SELECTION':
                if (inputLower.includes('otro') || inputLower.includes('2')) {
                    await sendToGateway(phone, "Para otros tratamientos (Cabello, Masajes, etc), por favor escríbenos al DM o llama a nuestra recepción. 📞")
                    await clearState(phone)
                } else if (inputLower.includes('uña') || inputLower.includes('una') || inputLower.includes('1')) {
                    await sendToGateway(phone, "¿Qué técnica prefieres?\n\n- Polygel\n- Semipermanente\n- Tradicional")
                    await updateState(phone, 'NAIL_TYPE', { service_type: 'Uñas' })
                } else {
                    // Fallback / Repeat
                    await sendToGateway(phone, "Por favor selecciona una opción válida:\n1. Uñas\n2. Otro Tratamiento")
                }
                break;

            case 'NAIL_TYPE':
                // Capture input as service detail
                // Normalize input a bit if needed, but saving raw is fine too, or match against keywords
                let detail = input
                // Simple normalization
                if (inputLower.includes('poly')) detail = "Polygel"
                if (inputLower.includes('semi')) detail = "Semipermanente"
                if (inputLower.includes('trad')) detail = "Tradicional"

                await sendToGateway(phone, `¿Con qué profesional te gustaría atenderte?\n\n- Fabiola\n- Damaris`)
                await updateState(phone, 'PROFESSIONAL', { ...currentTempData, service_detail: detail })
                break;

            case 'PROFESSIONAL': {
                let stylist = null
                if (inputLower.includes('fabiola')) stylist = "Fabiola"
                else if (inputLower.includes('damaris')) stylist = "Damaris"

                if (stylist) {
                    await sendToGateway(phone, `Perfecto con ${stylist}. ¿Para qué día y hora deseas tu cita? 🗓️\n\n(Ej: "Mañana a las 3pm" o "28 de Enero 4:00 PM")`)
                    await updateState(phone, 'DATE_TIME', { ...currentTempData, stylist })
                } else {
                    await sendToGateway(phone, "Por favor elige una profesional válida:\n- Fabiola\n- Damaris")
                }
                break;
            }

            case 'DATE_TIME': {
                // 1. Parse Date
                // We assume Spanish input mostly. chrono-node supports some locales or just generic.
                // Ideally we'd use 'es' locale if available in chrono-node, or generic.
                // Chrono generic often handles spanish months if they are similar or standard formats. 
                // Let's try parsing.
                const parsedDate = chrono.es.parseDate(input) || chrono.parseDate(input)

                if (!parsedDate) {
                    await sendToGateway(phone, "No pude entender la fecha/hora. 😓 Por favor intenta de nuevo con otro formato (Ej: 'Mañana 3pm' o 'Lunes 10:00').")
                    return NextResponse.json({ status: "success" }) // Don't change state
                }

                // Check valid future date
                const now = new Date()
                if (parsedDate < now) {
                    await sendToGateway(phone, "La fecha seleccionada ya pasó. Por favor elige una fecha futura.")
                    return NextResponse.json({ status: "success" })
                }

                // Format for DB
                // We extract date part and time part
                const year = parsedDate.getFullYear()
                const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
                const day = String(parsedDate.getDate()).padStart(2, '0')
                const dateStr = `${year}-${month}-${day}` // YYYY-MM-DD

                const hours = parsedDate.getHours()
                const minutes = parsedDate.getMinutes()
                const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` // HH:MM

                // Check Availability
                // Range +/- 59 mins? Or exact slot?
                // The requirements say: "considera un rango de 1 hora"
                // We'll check if there is ANY appointment for that stylist in the given 1 hour slot.
                // Assuming slots are standard 1 hour for now.

                const stylist = currentTempData.stylist || "Fabiola" // Fallback but should exist

                // Existing collisions:
                // Same Date, Same Stylist
                // StartTime collision
                // If existing.time == new.time => Collision
                // If existing starts at 3:00 (duration 60), it ends at 4:00.
                // If new request is 3:30, it starts inside [3:00, 4:00). Collision.
                // Simplest check: exact start time match OR simple overlap logic.

                // Converting requested time to minutes for comparison
                const reqStart = hours * 60 + minutes
                const reqEnd = reqStart + 60 // Assume 60m duration for the new service

                // Fetch appointments for that day & stylist
                const dayAppointments = await db.select()
                    .from(appointments)
                    .where(
                        and(
                            eq(appointments.date, dateStr),
                            eq(appointments.stylist, stylist as any),
                            not(eq(appointments.status, 'cancelada'))
                        )
                    )

                let isOccupied = false

                for (const apt of dayAppointments) {
                    const [h, m] = apt.time.split(':').map(Number)
                    const aptStart = h * 60 + m
                    const aptDuration = apt.duration || 60
                    const aptEnd = aptStart + aptDuration

                    // Overlap check
                    // Max(start1, start2) < Min(end1, end2)
                    if (Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)) {
                        isOccupied = true
                        break
                    }
                }

                if (isOccupied) {
                    await sendToGateway(phone, `Lo siento, ${stylist} está ocupada en ese horario (${dateStr} ${timeStr}) 🚫. Por favor dime otro horario.`)
                    // Keep state DATE_TIME
                } else {
                    // Success!
                    await db.insert(appointments).values({
                        id: crypto.randomUUID(),
                        clientName: user_name_fallback(userName),
                        clientPhone: phone,
                        date: dateStr,
                        time: timeStr,
                        duration: 60,
                        stylist: stylist,
                        serviceType: currentTempData.service_type || "General",
                        serviceDetail: currentTempData.service_detail || "Cita",
                        details: `Agendado vía WhatsApp: ${currentTempData.service_type} - ${currentTempData.service_detail}`,
                        status: "confirmada"
                    } as any)

                    await sendToGateway(phone, `✅ ¡Agendado! Tu cita de ${currentTempData.service_detail} con ${stylist} quedó para el ${parsedDate.toLocaleString('es-CO', { weekday: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Te esperamos.`)
                    await clearState(phone)
                }

                break;
            }

            default:
                // Should not happen, reset
                await updateState(phone, 'IDLE')
                await sendToGateway(phone, "Ocurrió un error en la conversación. Empecemos de nuevo. Hola!")
                break;
        }

        return NextResponse.json({ status: "success" })

    } catch (error) {
        console.error("Webhook processing error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

function user_name_fallback(name?: string) {
    return name || "Cliente WhatsApp"
}
