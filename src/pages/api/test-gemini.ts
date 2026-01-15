import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const apiKeyPrefix = apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING';

    try {
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'API Key missing in environment variables',
                apiKeyPrefix
            });
        }

        // Probaremos con v1 explícitamente si el SDK lo permite, 
        // o simplemente probando diferentes modelos.
        const genAI = new GoogleGenerativeAI(apiKey);

        let testResponse = "None";
        let modelUsed = "";
        let results: any = {};

        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-pro'
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Di "OK"');
                const text = (await result.response).text();
                results[modelName] = { success: true, response: text };
                if (!modelUsed) {
                    modelUsed = modelName;
                    testResponse = text;
                }
            } catch (err: any) {
                results[modelName] = { success: false, error: err.message };
            }
        }

        const success = !!modelUsed;

        return res.status(success ? 200 : 500).json({
            success,
            status: success ? 'connected' : 'error',
            testResponse,
            modelUsed,
            results,
            apiKeyPrefix,
            apiKeyLength: apiKey.length,
            note: "Si todos fallan con 404, revisa si hay restricciones de país o si la clave de API es realmente de AI Studio."
        });
    } catch (error: any) {
        console.error('[TEST-GEMINI] Error fatal:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            apiKeyPrefix
        });
    }
}
