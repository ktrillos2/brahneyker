const API_KEY = "AIzaSyA4aIYfwnPC22_z5Q2ZOSlLQEwXfjlMgco";
const MODEL_NAME = "gemini-1.5-flash-001";

async function testGemini() {
    console.log(`Testing Gemini API direct fetch...`);
    console.log(`Model: ${MODEL_NAME}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            parts: [{ text: "Hola, ¿estás funcionando?" }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.json();

        if (!response.ok) {
            console.error("Error Response:", JSON.stringify(data, null, 2));
        } else {
            console.log("Success! Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Network Error:", error);
    }
}

testGemini();
