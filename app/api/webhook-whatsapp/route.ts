import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, conversationState } from '@/lib/schema'
import { eq, and, not } from 'drizzle-orm'
import * as chrono from 'chrono-node'

// --- Configuration ---
const GATEWAY_URL = "http://3.21.167.162:3000/send-message"
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
        if (!response.ok) console.error(`[Gateway] Error: ${response.status}`)
    } catch (error) {
        console.error("[Gateway] Network error:", error)
    }
}

async function getState(phone: string) {
    const record = await db.select().from(conversationState).where(eq(conversationState.phone, phone))
    if (record.length === 0) return null
    return {
        step: record[0].step,
        data: JSON.parse(record[0].tempData || "{}")
    }
}

async function updateState(phone: string, step: string, data: any = {}) {
    const existing = await getState(phone)
    const newData = { ...(existing?.data || {}), ...data }

    // Check if record exists
    if (existing) {
        await db.update(conversationState).set({
            step,
            tempData: JSON.stringify(newData),
            lastUpdated: new Date().toISOString()
        }).where(eq(conversationState.phone, phone))
    } else {
        await db.insert(conversationState).values({
            phone,
            step,
            tempData: JSON.stringify(newData),
            lastUpdated: new Date().toISOString()
        })
    }
}

async function clearState(phone: string) {
    await db.delete(conversationState).where(eq(conversationState.phone, phone))
}

// --- Main Logic ---

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { phone, text, name, isGroup } = body

        // Ignore Groups
        if (isGroup) {
            console.log(`[Bot] Ignoring Group Message from ${phone}`)
            return NextResponse.json({ status: "ignored_group" })
        }

        if (!phone || !text) {
            return NextResponse.json({ error: "Missing phone or text" }, { status: 400 })
        }

        console.log(`[Bot] From: ${phone}, Msg: "${text}"`)

        // 1. Get Current State
        const state = await getState(phone)
        const currentStep = state?.step || 'WELCOME'
        const cleanText = text.trim().toLowerCase()

        // 2. Global "Reset" or "Hello" check (optional, but good for UX)
        if (['hola', 'reiniciar', 'inicio', 'menu'].includes(cleanText)) {
            await updateState(phone, 'WELCOME', {})
            await sendToGateway(phone, "👋 ¡Hola! Bienvenido a Brahneyker 💅.\n\n¿En qué podemos ayudarte hoy?\n\n1️⃣ Agendar Cita de Uñas\n2️⃣ Otro Servicio (Cejas, Pelo, Info)")
            return NextResponse.json({ status: "success" })
        }

        // 3. State Machine
        switch (currentStep) {
            case 'HUMAN_HANDOFF':
                console.log(`[Bot] Ignoring ${phone} (Human Handoff Active)`)
                return NextResponse.json({ status: "ignored", reason: "handoff" })

            case 'WELCOME':
                if (cleanText.includes('1') || cleanText.includes('uñas') || cleanText.includes('una') || cleanText.includes('cita')) {
                    await updateState(phone, 'SELECT_SERVICE')
                    await sendToGateway(phone, "💅 ¡Excelente elección! ¿Qué tipo de servicio deseas?\n\nA. Polygel\nB. Semipermanente\nC. Tradicional\n\n(Responde A, B o C)")
                } else if (cleanText.includes('2') || cleanText.includes('otro') || cleanText.includes('cejas') || cleanText.includes('pelo')) {
                    await updateState(phone, 'HUMAN_HANDOFF')
                    await sendToGateway(phone, "Entendido. Un asesor humano 👩‍💻 te escribirá pronto para ayudarte con ese servicio.\n\n(Este chat quedará en espera hasta que te contacten).")
                } else {
                    await sendToGateway(phone, "Disculpa, no entendí. Por favor responde:\n1️⃣ Para Uñas\n2️⃣ Para Otro Servicio")
                }
                break

            case 'SELECT_SERVICE':
                let service = ""
                if (cleanText.includes('a') || cleanText.includes('polygel')) service = "Uñas Polygel"
                else if (cleanText.includes('b') || cleanText.includes('semi')) service = "Uñas Semipermanentes"
                else if (cleanText.includes('c') || cleanText.includes('tradi')) service = "Uñas Tradicional"

                if (service) {
                    await updateState(phone, 'SELECT_STYLIST', { service })
                    await sendToGateway(phone, `✅ Has elegido: ${service}.\n\n¿Con qué profesional te gustaría agendar?\n\n1. Fabiola\n2. Damaris`)
                } else {
                    await sendToGateway(phone, "Por favor elige una opción válida:\nA. Polygel\nB. Semipermanente\nC. Tradicional")
                }
                break

            case 'SELECT_STYLIST':
                let stylist = ""
                if (cleanText.includes('1') || cleanText.includes('fabiola')) stylist = "Fabiola"
                else if (cleanText.includes('2') || cleanText.includes('damaris')) stylist = "Damaris"

                if (stylist) {
                    await updateState(phone, 'SELECT_DATE', { stylist })
                    await sendToGateway(phone, `✨ Perfecto, ${stylist} te atenderá.\n\nPor favor escribe la **Fecha y Hora** deseada.\nEjemplos:\n- "Mañana a las 3pm"\n- "El viernes a las 10 de la mañana"\n- "25 de febrero 4pm"`)
                } else {
                    await sendToGateway(phone, "Por favor elige una profesional:\n1. Fabiola\n2. Damaris")
                }
                break

            case 'SELECT_DATE':
                // Parse date with chrono-node
                const parsedDate = chrono.es.parseDate(text, new Date(), { forwardDate: true })

                if (!parsedDate) {
                    await sendToGateway(phone, "⚠️ No pude entender la fecha. Por favor intenta un formato más claro, ej: 'Mañana 3pm' o 'Lunes 10am'.")
                    return NextResponse.json({ status: "success" })
                }

                // Check availability
                const pendingData = state?.data || {}
                const { service: reqService, stylist: reqStylist } = pendingData

                // Format check logic
                // YYYY-MM-DD
                const datePart = parsedDate.toISOString().split('T')[0]
                // HH:MM
                const h = parsedDate.getHours()
                const m = parsedDate.getMinutes()
                const timePart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

                // Validate Business Hours (8am - 8pm)
                if (h < 8 || h >= 20) {
                    await sendToGateway(phone, `🚫 Lo siento, nuestro horario es de 8:00 AM a 8:00 PM. Intentaste agendar a las ${timePart}. Por favor elige otra hora.`)
                    return NextResponse.json({ status: "success" })
                }

                console.log(`Checking DB for ${reqStylist} at ${datePart} ${timePart}`)

                const reqStart = h * 60 + m
                const reqEnd = reqStart + 60 // 1 hour duration default

                const dayAppointments = await db.select()
                    .from(appointments)
                    .where(
                        and(
                            eq(appointments.date, datePart),
                            eq(appointments.stylist, reqStylist as any),
                            not(eq(appointments.status, 'cancelada'))
                        )
                    )

                let isOccupied = false
                for (const apt of dayAppointments) {
                    const [ah, am] = apt.time.split(':').map(Number)
                    const aptStart = ah * 60 + am
                    const aptDuration = apt.duration || 60
                    const aptEnd = aptStart + aptDuration

                    // Overlap check
                    if (Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)) {
                        isOccupied = true
                        break
                    }
                }

                if (isOccupied) {
                    await sendToGateway(phone, `🚫 Lo siento, ${reqStylist} ya está ocupada el ${datePart} a las ${timePart}.\n\nPor favor intenta otro horario (Ej: "Una hora más tarde" o "Mañana a las 9am").`)
                } else {
                    // Booking Success
                    await db.insert(appointments).values({
                        id: crypto.randomUUID(),
                        clientName: name || "Cliente",
                        clientPhone: phone,
                        date: datePart,
                        time: timePart,
                        duration: 60,
                        stylist: reqStylist,
                        serviceType: "Uñas",
                        serviceDetail: reqService,
                        details: `Agendado por WhatsApp Bot: ${reqService}`,
                        status: "confirmada"
                    } as any)

                    await sendToGateway(phone, `✅ **¡Cita Confirmada!**\n\n🗓 ${datePart} a las ${timePart}\n💅 Servicio: ${reqService}\n👩‍🦰 Pro: ${reqStylist}\n\n¡Te esperamos en Brahneyker!`)
                    await clearState(phone) // Reset flow
                }

                break

            default:
                // Fallback for unknown state, reset to welcome
                await updateState(phone, 'WELCOME', {})
                await sendToGateway(phone, "👋 ¡Hola! Bienvenido a Brahneyker 💅.\n\n¿En qué podemos ayudarte hoy?\n\n1️⃣ Agendar Cita de Uñas\n2️⃣ Otro Servicio (Cejas, Pelo, Info)")
                break
        }

        return NextResponse.json({ status: "success" })

    } catch (error) {
        console.error("Handler Error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
