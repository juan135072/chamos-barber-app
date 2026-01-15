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

        // Probar generación con flash primero
        let testResponse = "None";
        let modelUsed = 'gemini-1.5-flash';
        let status = 'connected';

        try {
            const model = genAI.getGenerativeModel({ model: modelUsed });
            const result = await model.generateContent('Di "OK Flash"');
            testResponse = (await result.response).text();
        } catch (err: any) {
            console.error(`[TEST-GEMINI] Falló con ${modelUsed}:`, err.message);

            // Fallback a gemini-pro
            try {
                modelUsed = 'gemini-pro';
                const modelFallback = genAI.getGenerativeModel({ model: modelUsed });
                const resultFallback = await modelFallback.generateContent('Di "OK Pro"');
                testResponse = (await resultFallback.response).text();
                status = 'connected-fallback';
            } catch (err2: any) {
                return res.status(500).json({
                    success: false,
                    status: 'error',
                    error: `Ambos modelos fallaron. Flash: ${err.message}. Pro: ${err2.message}`
                });
            }
        }

        return res.status(200).json({
            success: true,
            status: status,
            testResponse,
            modelUsed,
            router: 'pages',
            sdk: 'official-google',
            apiKeyLength: apiKey.length
        });
    } catch (error: any) {
        console.error('[TEST-GEMINI] Error fatal:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
