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

        const genAI = new GoogleGenerativeAI(apiKey);

        let testResponse = "None";
        let modelUsed = 'gemini-1.5-flash';
        let status = 'connected';

        // Intentar con la versión por defecto (v1beta habitualmente)
        try {
            const model = genAI.getGenerativeModel({ model: modelUsed });
            const result = await model.generateContent('Di "OK Flash"');
            testResponse = (await result.response).text();
        } catch (err: any) {
            console.error(`[TEST-GEMINI] Falló v1beta con ${modelUsed}:`, err.message);

            // Intentar forzando la versión v1 si está disponible en el SDK
            try {
                // En algunas versiones del SDK se puede especificar la versión en la configuración
                // pero si falla, intentamos con gemini-pro que es más antiguo y estable
                modelUsed = 'gemini-pro';
                const modelFallback = genAI.getGenerativeModel({ model: modelUsed });
                const resultFallback = await modelFallback.generateContent('Di "OK Pro"');
                testResponse = (await resultFallback.response).text();
                status = 'connected-fallback';
            } catch (err2: any) {
                // Si falla gemini-pro, intentamos el nombre alternativo gemini-1.0-pro
                try {
                    modelUsed = 'gemini-1.0-pro';
                    const modelAlt = genAI.getGenerativeModel({ model: modelUsed });
                    const resultAlt = await modelAlt.generateContent('Di "OK 1.0 Pro"');
                    testResponse = (await resultAlt.response).text();
                    status = 'connected-alt';
                } catch (err3: any) {
                    return res.status(500).json({
                        success: false,
                        status: 'error',
                        error: `Fallaron todos los modelos conocidos.`,
                        details: {
                            flash: err.message,
                            pro: err2.message,
                            pro10: err3.message
                        },
                        apiKeyPrefix,
                        apiKeyLength: apiKey.length,
                        tip: "Verifica que la API de 'Generative Language API' esté habilitada en Google Cloud Console para este proyecto."
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            status: status,
            testResponse,
            modelUsed,
            router: 'pages',
            sdk: 'official-google',
            apiKeyPrefix,
            apiKeyLength: apiKey.length
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
