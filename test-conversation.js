const PORT = 3001; // Asegúrate de que coincida con tu 'npm run dev' (vimos que era 3001)
const BASE_URL = `http://localhost:${PORT}/api/webhook-whatsapp`;
const PHONE_NUMBER = "573000123456"; // Un número de prueba consistente

// Helper para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMessage(text) {
    console.log(`\n👨‍💻 TÚ: "${text}"`);
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: PHONE_NUMBER,
                text: text, // La clave correcta esperamos que sea 'text' o 'message' según tu gateway, mi código usa 'text'
                name: "Tester Local"
            })
        });

        const data = await response.text();
        // A veces el webhook no devuelve el texto directo sino que lo manda al gateway.
        // Pero mi código imprime logs en la terminal de 'npm run dev'.
        // Sin embargo, si el webhook responde JSON, lo mostramos.
        console.log(`🤖 BOT (Status ${response.status}): ${data}`);
        return data;
    } catch (e) {
        console.error("Error envío:", e.message);
    }
}

async function runTest() {
    console.log("🚀 Iniciando Simulación de Chat con Gemini 2.5...");

    // 1. Saludo
    await sendMessage("Hola");

    await sleep(2000); // Esperar un poco

    // 2. Consulta de servicio con contexto (memoria)
    await sendMessage("Quiero una cita de uñas semipermanentes");

    await sleep(2000);

    // 3. Intento de agendamiento (Prueba de lógica de fechas)
    // "Mañana a las 10am" -> Gemini debe calcular la fecha real
    await sendMessage("Que sea con Fabiola para mañana a las 10am");
}

runTest();
