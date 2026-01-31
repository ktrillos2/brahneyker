const start = async () => {
    const payload = {
        phone: '573000000000',
        text: 'Hola prueba local', // Correct field name is 'text' not 'message'
        name: 'Tester'
    };

    const tryPort = async (port) => {
        console.log(`\n--- Testing Port ${port} ---`);
        try {
            const response = await fetch(`http://localhost:${port}/api/webhook-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log(`Status: ${response.status}`);
            const text = await response.text();
            console.log(`Response: ${text}`);
            if (response.status === 404) {
                console.log("❌ Endpoint not found on this port.");
                return false;
            }
            console.log("✅ Endpoint found and responded.");
            return true;
        } catch (error) {
            console.error(`Error connecting to port ${port}:`, error.message);
            return false;
        }
    };

    // Try port 3000 first
    const success3000 = await tryPort(3000);

    // If 3000 failed (likely 404 or connection refused), try 3001
    if (!success3000) {
        console.log("\n⚠️ Port 3000 failed/missing. Trying fallback port 3001 (where 'npm run dev' might be running)...");
        await tryPort(3001);
    }
};
start();
