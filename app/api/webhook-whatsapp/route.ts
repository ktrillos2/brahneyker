import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, conversationState } from '@/lib/schema'
import { eq, and, not, gte, desc } from 'drizzle-orm'
import * as chrono from 'chrono-node'

// --- Configuration ---
const GATEWAY_URL = "http://3.21.167.162:3000/send-message"
const GATEWAY_SECRET = "KYT_SECRET_2026"

const STYLISTS = ['Fabiola', 'Damaris', 'Karolina', 'Lizday', 'Stella']
const SERVICES = {
    'acrilico': 'Acrílico',
    'acrílico': 'Acrílico',
    'polygel': 'Polygel',
    'semi': 'Semipermanente',
    'semipermanente': 'Semipermanente',
    'tradicional': 'Tradicional',
    'tradi': 'Tradicional',
    'manos': 'Uñas (Generico)',
    'uñas': 'Uñas (Generico)',
    'pies': 'Pedicura',
    'pedicura': 'Pedicura'
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
    return message
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

async function hasFutureAppointment(phone: string) {
    const today = new Date().toISOString().split('T')[0]
    const active = await db.select().from(appointments).where(
        and(
            eq(appointments.clientPhone, phone),
            gte(appointments.date, today),
            not(eq(appointments.status, 'cancelada'))
        )
    )
    return active.length > 0
}

async function getKnownName(phone: string) {
    const lastAppt = await db.select({ name: appointments.clientName })
        .from(appointments)
        .where(eq(appointments.clientPhone, phone))
        .orderBy(desc(appointments.createdAt))
        .limit(1)

    return lastAppt.length > 0 ? lastAppt[0].name : null
}

// --- Logic Helpers ---

function parseRequest(text: string) {
    const normalize = text.toLowerCase()

    // Intent
    let intent = 'UNKNOWN'
    if (normalize.includes('uñas') || normalize.includes('cita') || normalize.includes('agendar') || normalize.includes('manicure') || normalize.includes('acrilico') || normalize.includes('polygel')) {
        intent = 'NAILS'
    } else if (normalize.includes('cejas') || normalize.includes('pelo') || normalize.includes('otro')) {
        intent = 'OTHER'
    }

    // Date
    const dateResults = chrono.es.parse(text, new Date(), { forwardDate: true })
    let date = null
    let ambiguousTime = false

    if (dateResults.length > 0) {
        date = dateResults[0].start.date()
        // Full text check for AM/PM logic
        const fullText = normalize
        console.log(`[Parser] Full Text: "${fullText}"`)

        // Strict check: Must have AM/PM indicator in the sentence
        if (!fullText.match(/am|pm|a\.m|p\.m|de la mañana|de la tarde|de la noche|mediodia/)) {
            ambiguousTime = true
            console.log("[Parser] Ambiguous Time Detected (No markers in full text)")
        }

        // Fix Chrono Logic: If text says "de la noche/tarde" and hour < 12, force PM
        if (date && (fullText.includes("de la tarde") || fullText.includes("de la noche") || fullText.includes("pm"))) {
            const h = date.getHours()
            if (h < 12) {
                date.setHours(h + 12)
                console.log(`[Parser] Fixed PM: ${h} -> ${h + 12}`)
            }
        }
    }

    // Stylists & Services
    const requests: any[] = []

    // Segmentation logic ("y")
    const foundStylistsGlobal: string[] = []
    STYLISTS.forEach(s => { if (normalize.includes(s.toLowerCase())) foundStylistsGlobal.push(s) })

    if (normalize.includes(" y ") && foundStylistsGlobal.length > 1) {
        const parts = normalize.split(" y ")
        parts.forEach(part => {
            let partStylist = null
            STYLISTS.forEach(s => { if (part.includes(s.toLowerCase())) partStylist = s })
            let partService = null
            Object.keys(SERVICES).forEach(k => {
                if (part.includes(k)) {
                    const val = SERVICES[k as keyof typeof SERVICES]
                    if (!partService || val !== 'Uñas (Generico)') partService = val
                }
            })
            if (partStylist) requests.push({ stylist: partStylist, service: partService })
        })
    }

    if (requests.length === 0) {
        const detectedServices: string[] = []
        Object.keys(SERVICES).forEach(k => {
            if (normalize.includes(k)) {
                const val = SERVICES[k as keyof typeof SERVICES]
                if (!detectedServices.includes(val)) detectedServices.push(val)
            }
        })
        const specificServices = detectedServices.filter(s => s !== 'Uñas (Generico)')
        const finalServices = specificServices.length > 0 ? specificServices : detectedServices

        if (foundStylistsGlobal.length > 0) {
            foundStylistsGlobal.forEach((sty, i) => {
                requests.push({ stylist: sty, service: finalServices[i] || finalServices[0] })
            })
        } else if (finalServices.length > 0) {
            requests.push({ service: finalServices[0] })
        }
    }

    return { intent, date, ambiguousTime, requests }
}

async function checkAvailability(date: Date, stylist: string) {
    const datePart = date.toISOString().split('T')[0]
    const h = date.getHours()
    const m = date.getMinutes()
    const timePart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    console.log(`Checking Availability: ${stylist} on ${datePart} ${timePart}`)

    if (h < 8 || h > 19) return { available: false, reason: "closed", timePart }

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

        // 0. Check Future Appointments
        const hasActive = await hasFutureAppointment(phone)
        const state = await getState(phone)
        const currentStep = state?.step || 'WELCOME'
        const cleanText = text.trim().toLowerCase()

        if (hasActive && (!state || state.step === 'WELCOME')) {
            console.log(`[Bot] Ignoring ${phone} (Has Active Appointment)`)
            return NextResponse.json({ status: "ignored", reason: "already_booked" })
        }

        // 1. Global Handoff Check
        if (currentStep === 'HUMAN_HANDOFF') {
            return NextResponse.json({ status: "ignored", reason: "handoff" })
        }

        // 2. Reset/Greeting
        if (['hola', 'inicio', 'buenos dias'].includes(cleanText) && !hasActive) {
            await updateState(phone, 'WELCOME', {})
            await sendToGateway(phone, "👋 ¡Hola! Bienvenido a Brahneyker 💅.\n\n¿En qué podemos ayudarte hoy?\n\n1️⃣ Agendar Cita de Uñas\n2️⃣ Otro Servicio (Cejas, Pelo, Info)")
            return NextResponse.json({ status: "success" })
        }

        // 3. ASK_NAME Response
        if (currentStep === 'ASK_NAME') {
            const providedName = text.trim()
            // Store Name
            await updateState(phone, 'CONFIRM_BOOKING', { clientName: providedName })

            // Re-display confirmation
            const data = state?.data!
            const dateObj = new Date(data.finalDate)
            await sendToGateway(phone, `👋 Un gusto, ${providedName}.\n\n✅ Confirmando: ${data.finalDate} a las ${data.finalTime}.\n\n¿Agendamos? (Responde **Ok**).`)
            return NextResponse.json({ status: "name_received" })
        }

        // 4. Confirm Booking Step
        if (currentStep === 'CONFIRM_BOOKING') {
            if (['ok', 'okey', 'si', 'dale', 'confirmar', 'listo'].includes(cleanText)) {
                const data = state?.data!
                // Name priority: 1. Stored in State (from ASK_NAME), 2. From DB (getKnownName logic check below), 3. Profile
                // Actually logic is: we moved to here because we HAVE a name in state OR we used DB name.
                const clientName = data.clientName || name || "Cliente"

                const successParams = []
                for (const req of data.pendingRequests) {
                    await db.insert(appointments).values({
                        id: crypto.randomUUID(),
                        clientName: clientName,
                        clientPhone: phone,
                        date: data.finalDate,
                        time: data.finalTime,
                        duration: 60,
                        stylist: req.stylist,
                        serviceType: "Uñas",
                        serviceDetail: req.service,
                        details: `Agendado por WhatsApp Bot: ${req.service}`,
                        status: "confirmada"
                    } as any)
                    successParams.push(`• ${req.service} con ${req.stylist}`)
                }

                await sendToGateway(phone, `✅ **¡Cita Confirmada!**\n\n🗓 ${data.finalDate} a las ${data.finalTime}\n${successParams.join("\n")}\n👤 ${clientName}\n\n¡Gracias por elegirnos!`)
                await clearState(phone)
                return NextResponse.json({ status: "booked" })

            } else {
                await sendToGateway(phone, "Entendido. No hemos agendado nada. ¿Deseas cambiar el horario? Escribe una nueva fecha (Ej: 'Mañana 4pm').")
                await updateState(phone, 'SELECT_DATE', { requests: state?.data.pendingRequests })
                return NextResponse.json({ status: "cancelled_confirmation" })
            }
        }

        // 5. AM/PM Selection Step
        if (currentStep === 'SELECT_AM_PM') {
            const prevData = state?.data!
            const baseDate = new Date(prevData.targetDateRaw)

            if (cleanText.includes('mañana') || cleanText.includes('am')) {
                let h = baseDate.getHours()
                if (h >= 12) baseDate.setHours(h - 12)
            } else if (cleanText.includes('tarde') || cleanText.includes('noche') || cleanText.includes('pm')) {
                let h = baseDate.getHours()
                if (h < 12) baseDate.setHours(h + 12)
            } else {
                await sendToGateway(phone, "Por favor responde: 'Mañana' o 'Tarde'.")
                return NextResponse.json({ status: "ask_am_pm_retry" })
            }

            // --- Availability Logic (Duplicated) ---
            const candidateRequests = prevData.requests
            const resolvedDate = baseDate

            let successParams = []
            let failParams = []
            let finalTimeParam = ""

            for (const req of candidateRequests) {
                const check = await checkAvailability(resolvedDate, req.stylist)
                if (check.available) {
                    successParams.push(req)
                    finalTimeParam = check.timePart
                } else {
                    if (check.reason === 'closed') failParams.push(`Lo siento, esa hora no está disponible (Horario: 8am - 7pm).`)
                    else failParams.push(`Esa hora ya está ocupada.`)
                }
            }

            const dateStr = resolvedDate.toISOString().split('T')[0]

            if (failParams.length > 0) {
                await sendToGateway(phone, `🚫 ${failParams.join(" ")} Intenta otro horario.`)
                await updateState(phone, 'SELECT_DATE', { requests: candidateRequests, targetDate: null })
                return NextResponse.json({ status: "unavailable", details: failParams })
            } else {
                // Check Name HERE too (Logic A)
                let clientName = await getKnownName(phone)

                if (!clientName) {
                    await sendToGateway(phone, `✅ Hay disponibilidad: ${dateStr} a las ${finalTimeParam}.\n\nAntes de finalizar, **¿cuál es tu nombre?**`)
                    await updateState(phone, 'ASK_NAME', {
                        pendingRequests: candidateRequests,
                        finalDate: dateStr,
                        finalTime: finalTimeParam
                    })
                    return NextResponse.json({ status: "ask_name" })
                } else {
                    await sendToGateway(phone, `✅ Hay disponibilidad: ${dateStr} a las ${finalTimeParam}.\n\n¿Te lo agendo, ${clientName}? (Escribe **Ok**).`)
                    await updateState(phone, 'CONFIRM_BOOKING', {
                        pendingRequests: candidateRequests,
                        finalDate: dateStr,
                        finalTime: finalTimeParam,
                        clientName
                    })
                    return NextResponse.json({ status: "confirm_booking" })
                }
            }
        }

        // 6. Normal Flow (Parser)
        const parsed = parseRequest(text)

        if (parsed.intent === 'OTHER' || cleanText.includes('otro servicio') || cleanText === '2') {
            await updateState(phone, 'HUMAN_HANDOFF')
            await sendToGateway(phone, "Entendido. Un asesor humano 👩‍💻 te escribirá pronto.")
            return NextResponse.json({ status: "handoff" })
        }

        if (currentStep === 'WELCOME' && (cleanText === '1' || parsed.intent === 'NAILS')) {
            await updateState(phone, 'SELECT_SERVICE')
        }

        const prevData = state?.data || {}
        let candidateRequests = [...(prevData.requests || [])]

        if (parsed.requests.length > 0) {
            if (currentStep === 'SELECT_SERVICE_SPECIFIC' && prevData.targetStylist) {
                const targetReq = candidateRequests.find((r: any) => r.stylist === prevData.targetStylist)
                if (targetReq && parsed.requests[0].service) targetReq.service = parsed.requests[0].service
                else {
                    if (cleanText.includes('acrilico')) targetReq.service = 'Acrílico'
                    else if (cleanText.includes('poly')) targetReq.service = 'Polygel'
                    else if (cleanText.includes('semi')) targetReq.service = 'Semipermanente'
                    else if (cleanText.includes('tradi')) targetReq.service = 'Tradicional'
                }
            } else {
                candidateRequests = parsed.requests
            }
        }

        if (candidateRequests.length === 0) candidateRequests.push({})
        const firstReq = candidateRequests[0]
        if (cleanText === '1' || cleanText.includes('fabiola')) firstReq.stylist = 'Fabiola'
        if (cleanText === '2' || cleanText.includes('damaris')) firstReq.stylist = 'Damaris'
        if (cleanText === '3' || cleanText.includes('carolina') || cleanText.includes('karolina')) firstReq.stylist = 'Karolina'
        if (cleanText === '4' || cleanText.includes('lizday')) firstReq.stylist = 'Lizday'
        if (cleanText === '6' || cleanText.includes('stella')) firstReq.stylist = 'Stella'
        if (cleanText === 'a') firstReq.service = 'Polygel'
        if (cleanText === 'b') firstReq.service = 'Semipermanente'
        if (cleanText === 'c') firstReq.service = 'Tradicional'

        let targetDate = parsed.date ? parsed.date : (prevData.targetDate ? new Date(prevData.targetDate) : null)

        // Validation - Service
        let incompleteReq = null
        for (const req of candidateRequests) {
            if (!req.service || req.service === 'Uñas (Generico)') { incompleteReq = req; break; }
        }
        if (incompleteReq) {
            const stylistMsg = incompleteReq.stylist ? ` con ${incompleteReq.stylist}` : ""
            await updateState(phone, 'SELECT_SERVICE_SPECIFIC', { requests: candidateRequests, targetStylist: incompleteReq.stylist, targetDate })
            await sendToGateway(phone, `💅 ¿Qué técnica de uñas deseas${stylistMsg}?\n\n• Acrílico\n• Polygel\n• Semipermanente\n• Tradicional`)
            return NextResponse.json({ status: "ask_service_specific" })
        }

        // Validation - Stylist
        if (!candidateRequests.every((r: any) => r.stylist)) {
            await updateState(phone, 'SELECT_STYLIST', { requests: candidateRequests, targetDate })
            await sendToGateway(phone, `👩‍🦰 ¿Con quién te gustaría agendar?\n\n1. Fabiola\n2. Damaris\n3. Karolina\n4. Lizday\n6. Stella`)
            return NextResponse.json({ status: "ask_stylist" })
        }

        // Validation - Date
        if (!targetDate) {
            await updateState(phone, 'SELECT_DATE', { requests: candidateRequests })
            await sendToGateway(phone, `🗓 ¿Para qué **Fecha y Hora** deseas la cita?\n\n(Ej: "Mañana 3pm" o "Viernes 10am")`)
            return NextResponse.json({ status: "ask_date" })
        }

        // --- AM/PM Ambiguity Check ---
        if (parsed.ambiguousTime) {
            await updateState(phone, 'SELECT_AM_PM', { requests: candidateRequests, targetDateRaw: targetDate.toISOString() })
            await sendToGateway(phone, "🤔 ¿Te refieres a la **Mañana** o a la **Tarde**?")
            return NextResponse.json({ status: "ask_am_pm" })
        }

        // Availability (Pre-Confirm)
        let successParams = []
        let failParams = []
        let finalTimeParam = ""

        for (const req of candidateRequests) {
            const check = await checkAvailability(targetDate, req.stylist)
            if (check.available) {
                successParams.push(req)
                finalTimeParam = check.timePart
            } else {
                if (check.reason === 'closed') failParams.push(`Lo siento, esa hora no está disponible (Horario: 8am - 7pm).`)
                else failParams.push(`Esa hora ya está ocupada.`)
            }
        }

        if (failParams.length > 0) {
            await sendToGateway(phone, `🚫 ${failParams.join(" ")} Intenta otro horario.`)
            await updateState(phone, 'SELECT_DATE', { requests: candidateRequests, targetDate: null })
            return NextResponse.json({ status: "unavailable", details: failParams })
        } else {
            // Check Name Logic (Logic B - Main Flow)
            let clientName = await getKnownName(phone)

            if (!clientName) {
                await sendToGateway(phone, `✅ Hay disponibilidad: ${targetDate.toISOString().split('T')[0]} a las ${finalTimeParam}.\n\nAntes de finalizar, **¿cuál es tu nombre?**`)
                await updateState(phone, 'ASK_NAME', {
                    pendingRequests: candidateRequests,
                    finalDate: targetDate.toISOString().split('T')[0],
                    finalTime: finalTimeParam
                })
                return NextResponse.json({ status: "ask_name" })
            } else {
                await sendToGateway(phone, `✅ Hay disponibilidad: ${targetDate.toISOString().split('T')[0]} a las ${finalTimeParam}.\n\n¿Te lo agendo, ${clientName}? (Escribe **Ok**).`)
                await updateState(phone, 'CONFIRM_BOOKING', {
                    pendingRequests: candidateRequests,
                    finalDate: targetDate.toISOString().split('T')[0],
                    finalTime: finalTimeParam,
                    clientName
                })
                return NextResponse.json({ status: "confirm_booking" })
            }
        }

        return NextResponse.json({ status: "success" })

    } catch (error) {
        console.error("Handler Error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
