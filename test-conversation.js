const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/webhook-whatsapp`;
const PHONE_NUMBER = "573007778899"; // Nuevo número para probar One-Shot

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
                name: "Tester OneShot"
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
    console.log("🚀 Iniciando Simulación Híbrida (One Shot)...");

    // 1. Reset / Saludo
    await sendMessage("Hola");
    await sleep(1000);

    // 2. ONE SHOT: Todo en uno
    // "Quiero uñas semipermanentes con Fabiola para mañana a las 10am"
    // El sistema debería detector: Intent=NAILS, Service=Semi, Stylist=Fabiola, Date=Mañana 10am
    // Y responder con Confirmación directa o Bloqueo por horario.
    await sendMessage("Quiero uñas semipermanentes con Fabiola para mañana a las 10am");
}

runTest();
