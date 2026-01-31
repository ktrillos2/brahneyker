const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/webhook-whatsapp`;
const PHONE_NUMBER = "573133087069"; // Número de prueba para flujo limpio

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
                name: "Tester Rules"
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
    console.log("🚀 Iniciando Simulación de Reglas (Sin IA)...");

    // 1. Reset / Saludo
    await sendMessage("Hola");
    await sleep(1000);

    // 2. Elegir Uñas (Opción 1)
    await sendMessage("1");
    await sleep(1000);

    // 3. Elegir Polygel (Opción A)
    await sendMessage("A");
    await sleep(1000);

    // 4. Elegir Fabiola (Opción 1)
    await sendMessage("1");
    await sleep(1000);

    // 5. Fecha
    await sendMessage("Mañana a las 3pm");
}

runTest();
