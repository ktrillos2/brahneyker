const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/webhook-whatsapp`;
const PHONE_NUMBER = "573001234567"; // New Number

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMessage(text) {
    console.log(`\n👨‍💻 TÚ: "${text}"`);
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: PHONE_NUMBER,
                text: text,
                name: "Tester Name" // This mimic profile name, ignored if DB check priority
            })
        });

        const data = await response.json();
        console.log(`🤖 SERVER:`, data);
        return data;
    } catch (e) {
        console.error("Error envío:", e.message);
    }
}

async function runTest() {
    console.log("🚀 Simulación: Memoria de Nombre");

    // PHASE 1: New User
    await sendMessage("Hola");
    await sleep(500);
    await sendMessage("Quiero uñas polygel con Fabiola mañana a las 3pm");
    await sleep(2000);
    // Should return status: ask_name

    await sendMessage("Maria Estefania");
    await sleep(1000);
    // Should return status: name_received / confirm_booking

    await sendMessage("Ok");
    await sleep(2000);
    // Should return status: booked

    console.log("--- Reiniciando para Fase 2 ---");
    // Wait/Reset state manually or via helper?
    // User is blocked if booked. I need to bypass block or use a different time?
    // Actually, "Hola" triggers block.
    // But I want to test Name Recall.
    // I can manually clear the appointment in DB via raw SQL? 
    // Or just accept that I can't book again immediately?
    // Wait, the block prevents chatting. I can't test recall if I'm blocked.
    // UNLESS I book a date far in future, and then the block is "active"?

    // To test recall, I need to NOT have an active appointment OR the block logic should allow booking more?
    // User said: "si vuelven a escribir ya no se responde".
    // So I can't test recall immediately unless I delete the appointment.

    // I will verify Phase 1 worked (status booked).
    // Then I will manually insert a log saying "Phase 2 requires manual DB reset or waiting for appointment to pass".
}

runTest();
