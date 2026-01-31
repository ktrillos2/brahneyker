import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, conversationState } from '@/lib/schema'
import { eq, and, not } from 'drizzle-orm'
import * as chrono from 'chrono-node'

// --- Configuration ---
const GATEWAY_URL = "http://3.21.167.162:3000/send-message"
const GATEWAY_SECRET = "KYT_SECRET_2026"

// --- Constants ---
const STYLISTS = ['Fabiola', 'Damaris']
const SERVICES = {
    'polygel': 'Polygel',
    'semi': 'Semipermanente',
    'semipermanente': 'Semipermanente',
    'tradicional': 'Tradicional',
    'tradi': 'Tradicional',
    'manos': 'Manicura',
    'pies': 'Pedicura'
}

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
    const record = await db.select().from(conversationState).where(eq(conversationState.phone, phone))
    if (record.length > 0) {
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

// --- Smart Parser ---

function parseRequest(text: string) {
    const normalize = text.toLowerCase()

    // 1. Detect Intent
    let intent = 'UNKNOWN'
    if (normalize.includes('uñas') || normalize.includes('cita') || normalize.includes('agendar') || normalize.includes('manicure') || normalize.includes('pedicure') || normalize.includes('mano') || normalize.includes('pies')) {
        intent = 'NAILS'
    } else if (normalize.includes('cejas') || normalize.includes('pelo') || normalize.includes('cabello') || normalize.includes('otro')) {
        intent = 'OTHER'
    }

    // 2. Parse Date
    const dateResults = chrono.es.parse(text, new Date(), { forwardDate: true })
    const date = dateResults.length > 0 ? dateResults[0].start.date() : null

    // 3. Detect Stylists & Services (Simple Iteration for One-Shot)
    // We try to detect distinct requests if "y" is present, or global if not.
    // E.g. "Fabiola manos y Damaris pies"

    const requests: any[] = []

    // Split by "y", ",", "con" to find segments? 
    // Simple approach: Find all mentions and map.
    // If 1 stylist + 1 service -> 1 Request.
    // If 2 stylists + 2 services -> Heuristic matching (Order based?)

    // Let's rely on flexible detection.
    const detectedStylists: string[] = []
    STYLISTS.forEach(s => {
        if (normalize.includes(s.toLowerCase())) detectedStylists.push(s)
    })

    const detectedServices: string[] = []
    Object.keys(SERVICES).forEach(k => {
        if (normalize.includes(k)) {
            // Avoid duplicates (semi & semipermanente)
            const val = SERVICES[k as keyof typeof SERVICES]
            if (!detectedServices.includes(val)) detectedServices.push(val)
        }
    })

    // Pairing Logic
    if (detectedStylists.length > 0) {
        if (detectedStylists.length === detectedServices.length) {
            // Assume strict order: 1st stylist -> 1st service
            detectedStylists.forEach((stylist, i) => {
                requests.push({ stylist, service: detectedServices[i] })
            })
        } else if (detectedServices.length === 1 && detectedStylists.length >= 1) {
            // 1 Service for ALL detected stylists? OR 1 Stylist for 1 Service
            requests.push({ stylist: detectedStylists[0], service: detectedServices[0] })
            // If extra stylists?
            if (detectedStylists.length > 1) {
                // Maybe they want the same service for both?
                for (let i = 1; i < detectedStylists.length; i++) {
                    requests.push({ stylist: detectedStylists[i], service: detectedServices[0] })
                }
            }
        } else if (detectedStylists.length === 1 && detectedServices.length > 1) {
            // 1 Stylist performing Multiple Services?
            // Merge services into string?
            requests.push({ stylist: detectedStylists[0], service: detectedServices.join(" + ") })
        } else {
            // Fallback: Just take what we have
            if (detectedStylists[0]) requests.push({ stylist: detectedStylists[0] })
        }
    } else {
        // No stylist?
        if (detectedServices.length > 0) requests.push({ service: detectedServices.join(" + ") })
    }

    return { intent, date, requests, detectedStylists, detectedServices }
}

async function checkAvailability(date: Date, stylist: string) {
    const datePart = date.toISOString().split('T')[0]
    const h = date.getHours()
    const m = date.getMinutes()
    const timePart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    console.log(`Checking Availability: ${stylist} on ${datePart} ${timePart}`)

    if (h < 8 || h >= 20) return { available: false, reason: "closed" }

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

    return { available: !isOccupied, datePart, timePart }
}


// --- Main Logic ---

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { phone, text, name, isGroup } = body

        if (isGroup) return NextResponse.json({ status: "ignored_group" })
        if (!phone || !text) return NextResponse.json({ error: "Missing data" }, { status: 400 })

        console.log(`[Bot] From: ${phone}, Msg: "${text}"`)

        // 1. Get State
        const state = await getState(phone)
        const currentStep = state?.step || 'WELCOME'
        const cleanText = text.trim().toLowerCase()

        // 2. Global Handoff Check
        if (currentStep === 'HUMAN_HANDOFF') {
            return NextResponse.json({ status: "ignored", reason: "handoff" })
        }

        // 3. Reset/Greeting
        if (['hola', 'inicio', 'buenos dias', 'buenas tardes'].includes(cleanText)) {
            await updateState(phone, 'WELCOME', {})
            await sendToGateway(phone, "👋 ¡Hola! Bienvenido a Brahneyker 💅.\n\n¿En qué podemos ayudarte hoy?\n\n1️⃣ Agendar Cita de Uñas\n2️⃣ Otro Servicio (Cejas, Pelo, Info)")
            return NextResponse.json({ status: "success" })
        }

        // 4. Parser Run
        const parsed = parseRequest(text)

        // --- Special Handling: Explicit "Other" ---
        if (parsed.intent === 'OTHER' || cleanText.includes('otro servicio') || cleanText === '2') {
            await updateState(phone, 'HUMAN_HANDOFF')
            await sendToGateway(phone, "Entendido. Un asesor humano 👩‍💻 te escribirá pronto.\n\n(Este chat quedará en espera).")
            return NextResponse.json({ status: "handoff" })
        }

        // --- Logic Controller ---

        // A. If we are in WELCOME and user says "1" or "Uñas"
        if (currentStep === 'WELCOME' && (cleanText === '1' || parsed.intent === 'NAILS')) {
            // Check if we already have robust info from the first message
            // e.g. "Hola quiero uñas mañana 3pm con Fabiola"
            if (parsed.date && parsed.detectedStylists.length > 0) {
                // Fast-track: Fallthrough to confirmation logic below
            } else {
                // Step-by-step
                await updateState(phone, 'SELECT_SERVICE')
                await sendToGateway(phone, "💅 ¡Excelente! ¿Qué tipo de servicio?\n\nA. Polygel\nB. Semipermanente\nC. Tradicional")
                return NextResponse.json({ status: "success" })
            }
        }

        // B. Merging Data
        // We accumulate data from previous state + new message
        const prevData = state?.data || {}
        let candidateRequests = [...(prevData.requests || [])]

        // If parser found new structured requests, override or add?
        // If we are in SELECT_SERVICE, we expect service info.
        if (currentStep === 'SELECT_SERVICE') {
            if (parsed.detectedServices.length > 0) {
                // Found explicit service name
                // Update logical request
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].service = parsed.detectedServices[0]
            } else if (cleanText.includes('a') || cleanText.includes('poly')) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].service = 'Polygel'
            } else if (cleanText.includes('b') || cleanText.includes('semi')) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].service = 'Semipermanente'
            } else if (cleanText.includes('c') || cleanText.includes('tradi')) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].service = 'Tradicional'
            }
        }

        if (currentStep === 'SELECT_STYLIST') {
            if (parsed.detectedStylists.length > 0) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].stylist = parsed.detectedStylists[0]
            } else if (cleanText.includes('1') || cleanText.includes('fabiola')) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].stylist = 'Fabiola'
            } else if (cleanText.includes('2') || cleanText.includes('damaris')) {
                if (candidateRequests.length === 0) candidateRequests.push({})
                candidateRequests[0].stylist = 'Damaris'
            }
        }

        // Always try to grab date if present
        let targetDate = parsed.date ? parsed.date : (prevData.targetDate ? new Date(prevData.targetDate) : null)

        // Also grab one-shot requests if valid
        if (parsed.requests.length > 0) {
            candidateRequests = parsed.requests
        }

        // C. Validation & Next Step
        // We need: Service, Stylist, Date.
        const firstReq = candidateRequests[0] || {}

        if (!firstReq.service) {
            await updateState(phone, 'SELECT_SERVICE', { requests: candidateRequests })
            // If we didn't just ask this...
            if (currentStep !== 'SELECT_SERVICE') {
                await sendToGateway(phone, "💅 ¿Qué tipo de servicio deseas?\n\nA. Polygel\nB. Semipermanente\nC. Tradicional")
            } else {
                await sendToGateway(phone, "Por favor elige una opción válida (A, B, C).")
            }
            return NextResponse.json({ status: "ask_service" })
        }

        if (!firstReq.stylist) {
            await updateState(phone, 'SELECT_STYLIST', { requests: candidateRequests })
            if (currentStep !== 'SELECT_STYLIST') {
                await sendToGateway(phone, `✅ Elegido: ${firstReq.service}.\n¿Con quién te gustaría agendar?\n\n1. Fabiola\n2. Damaris`)
            } else {
                await sendToGateway(phone, "Por favor elige: 1. Fabiola o 2. Damaris.")
            }
            return NextResponse.json({ status: "ask_stylist" })
        }

        if (!targetDate) {
            await updateState(phone, 'SELECT_DATE', { requests: candidateRequests })
            if (parsed.date === null && currentStep === 'SELECT_DATE') {
                await sendToGateway(phone, "⚠️ No reconocí la fecha. Intenta formato: 'Mañana 3pm' o 'Viernes 10:00'.")
            } else {
                await sendToGateway(phone, `✨ ${firstReq.stylist} te atenderá.\n\nPor favor escribe la **Fecha y Hora** (Ej: "Mañana 3pm").`)
            }
            return NextResponse.json({ status: "ask_date" })
        }

        // D. Availability Check & Booking
        // Iterate all requests (usually 1, but maybe 2)
        let successParams = []
        let failParams = []

        for (const req of candidateRequests) {
            // Default if missing in multi-req?
            const srv = req.service || firstReq.service
            const sty = req.stylist || firstReq.stylist
            // Use global date
            const check = await checkAvailability(targetDate, sty)

            if (check.available) {
                // BOOK
                await db.insert(appointments).values({
                    id: crypto.randomUUID(),
                    clientName: name || "Cliente",
                    clientPhone: phone,
                    date: check.datePart,
                    time: check.timePart,
                    duration: 60,
                    stylist: sty,
                    serviceType: "Uñas",
                    serviceDetail: srv,
                    details: `Agendado por WhatsApp Bot: ${srv}`,
                    status: "confirmada"
                } as any)
                successParams.push(`${srv} con ${sty} (${check.timePart})`)
            } else {
                failParams.push(`${sty} está ocupada a las ${check.timePart}`)
            }
        }

        if (failParams.length > 0) {
            // Report Issues
            await sendToGateway(phone, `🚫 Disponibilidad:\n\n${failParams.join("\n")}\n\nPor favor intenta otro horario.`)
            // Keep state to retry date
            await updateState(phone, 'SELECT_DATE', { requests: candidateRequests, targetDate: null })
        } else {
            // Success
            const dateStr = targetDate.toLocaleDateString('es-CO')
            await sendToGateway(phone, `✅ **¡Cita Agendada!**\n\n🗓 ${dateStr}\n${successParams.join("\n")}\n\n¡Te esperamos!`)
            await clearState(phone)
        }

        return NextResponse.json({ status: "success" })

    } catch (error) {
        console.error("Handler Error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
