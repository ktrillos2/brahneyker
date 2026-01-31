import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, conversationState } from '@/lib/schema'
import { eq, and, not } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'

// --- Configuration ---
const GATEWAY_URL = "http://3.21.167.162:3000/send-message"
const GATEWAY_SECRET = "KYT_SECRET_2026"

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

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

async function getHistory(phone: string) {
    const record = await db.select().from(conversationState).where(eq(conversationState.phone, phone))
    if (record.length === 0) return []

    try {
        const data = JSON.parse(record[0].tempData || "{}")
        return data.history || []
    } catch {
        return []
    }
}

async function saveHistory(phone: string, role: "user" | "model", text: string) {
    // We append to existing history
    const existing = await getHistory(phone)
    const newHistory = [...existing, { role, parts: [{ text }] }]

    // Store in DB
    // Check if record exists first (simple upsert logic equivalent)
    const record = await db.select().from(conversationState).where(eq(conversationState.phone, phone))

    if (record.length > 0) {
        await db.update(conversationState).set({
            tempData: JSON.stringify({ history: newHistory }),
            lastUpdated: new Date().toISOString()
        }).where(eq(conversationState.phone, phone))
    } else {
        await db.insert(conversationState).values({
            phone,
            step: 'AI_CHAT',
            tempData: JSON.stringify({ history: newHistory }),
            lastUpdated: new Date().toISOString()
        })
    }
}

async function clearHistory(phone: string) {
    await db.delete(conversationState).where(eq(conversationState.phone, phone))
}

// --- Main Logic ---

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { phone, text, name } = body

        if (!phone || !text) {
            return NextResponse.json({ error: "Missing phone or text" }, { status: 400 })
        }

        console.log(`[AI Bot] From: ${phone}, Msg: "${text}"`)

        // 1. Prepare Context
        const now = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })

        const systemPrompt = `
Eres FabiolaBot, la recepcionista virtual de 'Brahneyker' en Cúcuta, Colombia.
Habla con acento local suave, amable y usa emojis (💅, ✨).

Tus Servicios: Uñas (Técnicas: Polygel, Semipermanente, Tradicional).
Tus Profesionales: Fabiola y Damaris.
Horario: Lunes a Sábado, 8am a 8pm.
FECHA_Y_HORA_ACTUAL_COLOMBIA: ${now}

TU OBJETIVO:
Conversar para obtener 3 datos:
1. Servicio y Técnica (ej: Uñas Polygel).
2. Profesional (Fabiola o Damaris).
3. Fecha y Hora exacta (ISO 8601).

REGLAS DE RESPUESTA:
- Si el usuario solo saluda o pregunta info, responde con texto normal amigable.
- Si el usuario intenta agendar pero faltan datos, pregúntalos.
- IMPORTANTE: Si tienes TODOS los datos (Servicio, Pro y Fecha), NO respondas texto. Responde ÚNICAMENTE este JSON:
{ 
    "action": "CHECK_AVAILABILITY", 
    "stylist": "Fabiola", 
    "date": "2026-02-01 15:00:00", 
    "service_detail": "Polygel" 
}
- Nota: Calcula la fecha basándote en que hoy es ${now}.
`

        // 2. Chat with Gemini
        // Load history
        let history = await getHistory(phone)

        // Start chat session with system instruction? 
        // Gemini Pro via API usually takes system instruction as part of strict prompt or first message.
        // For 'gemini-pro' standard, using sendMessage on chatSession is best.
        // We will prepend system prompt context to the history or strictly manage it.
        // Actually, easiest way is: 

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. ¡Hola! Soy FabiolaBot 💅. Estoy lista para atenderte." }]
                },
                ...history
            ]
        })

        const result = await chat.sendMessage(text)
        const responseText = result.response.text()

        // 3. Process Response
        console.log(`[Gemini Response]: ${responseText}`)

        let finalMessage = responseText

        // Check if response is JSON (Action)
        let actionData = null
        try {
            // Try to find JSON block in case it wrapped it in ```json
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                actionData = JSON.parse(jsonMatch[0])
            }
        } catch (e) {
            // Not JSON, normal text
        }

        if (actionData && actionData.action === "CHECK_AVAILABILITY") {
            // 4. DB Check
            const { stylist, date, service_detail } = actionData

            // Parse date string (Expected: YYYY-MM-DD HH:MM:SS)
            // We only need Date (YYYY-MM-DD) and Time (HH:MM)
            const [datePart, timePartFull] = date.split(' ')
            const timePart = timePartFull ? timePartFull.substring(0, 5) : "00:00" // HH:MM

            console.log(`Checking DB for ${stylist} at ${datePart} ${timePart}`)

            // Check availability (+/- 1 hour logic handled by simplified exact slot check + overlaps)
            const [h, m] = timePart.split(':').map(Number)
            const reqStart = h * 60 + m
            const reqEnd = reqStart + 60

            const dayAppointments = await db.select()
                .from(appointments)
                .where(
                    and(
                        eq(appointments.date, datePart),
                        eq(appointments.stylist, stylist as any),
                        not(eq(appointments.status, 'cancelada'))
                    )
                )

            let isOccupied = false
            for (const apt of dayAppointments) {
                const [ah, am] = apt.time.split(':').map(Number)
                const aptStart = ah * 60 + am
                const aptDuration = apt.duration || 60
                const aptEnd = aptStart + aptDuration

                if (Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)) {
                    isOccupied = true
                    break
                }
            }

            if (isOccupied) {
                // 5A. Occupied -> Ask Gemini for apology
                const apologyPrompt = `
                La fecha solicitada (${date}) para ${stylist} NO está disponible.
                Genera un mensaje amable y corto disculpándote y pidiendo que elija otro horario.
                `
                const apologyResult = await chat.sendMessage(apologyPrompt) // We extend the same chat
                finalMessage = apologyResult.response.text()

                // Do NOT save this specific exchange to history? Or yes?
                // Probably yes to keep context.
                await saveHistory(phone, "user", text)
                await saveHistory(phone, "model", finalMessage)

            } else {
                // 5B. Free -> Insert & Confirm
                console.log("Slot free. Booking...")

                await db.insert(appointments).values({
                    id: crypto.randomUUID(),
                    clientName: name || "Cliente",
                    clientPhone: phone,
                    date: datePart,
                    time: timePart,
                    duration: 60,
                    stylist: stylist,
                    serviceType: "Uñas", // Inferred from context or AI
                    serviceDetail: service_detail,
                    details: `Agendado por IA: ${service_detail}`,
                    status: "confirmada"
                } as any)

                const confirmPrompt = `
                La cita ha sido AGENDADA EXITOSAMENTE en el sistema.
                Detalles: ${service_detail} con ${stylist} el ${date}.
                Genera un mensaje emocionado confirmando la cita al cliente.
                `
                const confirmResult = await chat.sendMessage(confirmPrompt)
                finalMessage = confirmResult.response.text()

                // Clear history after success? Or keep?
                // Request says "SI ESTÁ LIBRE... envíalo." doesnt explicitly say reset, 
                // but usually good practice to reset or keep. 
                // Previous logic reset state. Let's clear history to start fresh next time.
                await clearHistory(phone)

                // We send the final message and return EARLY to avoid saving history again below
                await sendToGateway(phone, finalMessage)
                return NextResponse.json({ status: "success" })
            }
        } else {
            // Normal conversation turn
            await saveHistory(phone, "user", text)
            await saveHistory(phone, "model", finalMessage)
        }

        // Send response
        await sendToGateway(phone, finalMessage)

        return NextResponse.json({ status: "success" })

    } catch (error) {
        console.error("AI Handler Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
