import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env o .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { generateChatResponse } from '../lib/ai-agent';

async function debug() {
    const testMessage = "Me puedes ayudar con los servicios";
    const testId = "debug-session-" + Date.now();

    console.log('--- INICIANDO DEPURACIÓN DE GUSTAVO ---');
    console.log('Mensaje:', testMessage);
    console.log('ID sesión:', testId);
    console.log('API KEY presente:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    try {
        const response = await generateChatResponse(testMessage, testId);
        console.log('\n--- RESPUESTA FINAL DE GUSTAVO ---');
        console.log(response);
        console.log('---------------------------------');
    } catch (error) {
        console.error('\n--- ERROR CRÍTICO EN EL SCRIPT ---');
        console.error(error);
    }
}

debug();
