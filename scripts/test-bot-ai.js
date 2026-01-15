require('dotenv').config({ path: '.env.local' });
const { generateChatResponse } = require('../src/lib/ai-agent');

async function testAI() {
    const testMessages = [
        "Hola, ¿cuánto sale el corte?",
        "Quiero agendar para mañana",
        "¿Qué barberos tienen?",
        "Me atendieron súper mal el otro día",
        "¿Hacen masajes?"
    ];

    console.log("🚀 Testing ChamoBot AI...\n");

    for (const msg of testMessages) {
        console.log(`👤 User: ${msg}`);
        try {
            const response = await generateChatResponse(msg);
            console.log(`🤖 ChamoBot: ${response}`);
            console.log("-".repeat(50));
        } catch (error) {
            console.error("❌ Error response:", error);
        }
    }
}

testAI();
