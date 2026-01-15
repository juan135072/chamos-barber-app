import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'API Key missing in environment variables'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Listar modelos disponibles para ver qué ID es el correcto en este entorno
        let availableModels: any[] = [];
        try {
            const modelsResult = await genAI.listModels();
            availableModels = modelsResult.models.map(m => ({
                name: m.name,
                displayName: m.displayName,
                supportedGenerationMethods: m.supportedGenerationMethods
            }));
        } catch (listErr: any) {
            console.error('[TEST-GEMINI] Error al listar modelos:', listErr.message);
            availableModels = [{ error: listErr.message }];
        }

        // Probar generación con un nombre que suele ser universal
        let testResponse = "None";
        let modelUsed = 'gemini-1.5-flash';
        try {
            const model = genAI.getGenerativeModel({ model: modelUsed });
            const result = await model.generateContent('Di "OK"');
            testResponse = (await result.response).text();
        } catch (err: any) {
            console.error(`[TEST-GEMINI] Falló con ${modelUsed}:`, err.message);
            testResponse = `Error con ${modelUsed}: ${err.message}`;

            // Fallback extremadamente seguro: gemini-pro
            try {
                modelUsed = 'gemini-pro';
                const modelFallback = genAI.getGenerativeModel({ model: modelUsed });
                const resultFallback = await modelFallback.generateContent('Di "OK Fallback"');
                testResponse = (await resultFallback.response).text() + " (via gemini-pro)";
            } catch (err2: any) {
                testResponse += ` | También falló gemini-pro: ${err2.message}`;
            }
        }

        return res.status(200).json({
            success: true,
            status: 'connected',
            testResponse,
            modelUsed,
            availableModels,
            router: 'pages',
            sdk: 'official-google',
            apiKeyLength: apiKey.length,
            apiKeyPrefix: apiKey.substring(0, 10) + '...'
        });
    } catch (error: any) {
        console.error('[TEST-GEMINI] Error fatal:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
