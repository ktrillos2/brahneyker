const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/webhook-whatsapp`;
const PHONE_NUMBER = "573009990001"; // New number

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
                name: "Tester Time 2"
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
    console.log("🚀 Simulación: Tiempos Naturales (Specific)");

    // Case 1: "9 de la noche" -> Closed
    await sendMessage("Hola");
    await sleep(500);
    // Use specific service to bypass validation
    await sendMessage("Quiero uñas polygel con Fabiola mañana a las 9 de la noche");
    await sleep(2000);

    await sendMessage("reiniciar");
    await sleep(500);

    // Case 2: "9 y media" -> Ambiguous
    await sendMessage("Quiero uñas polygel con Fabiola mañana a las 9 y media");
}

runTest();
