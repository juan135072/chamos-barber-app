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
        let results: any = {};
        let modelUsed = "";

        // 1. Intentar listar modelos (esto nos dirá qué está permitido REALMENTE)
        // Usamos fetch directo para evitar problemas de tipos en el build si el método no está en la versión del SDK
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            results['listModels'] = listData;
        } catch (listErr: any) {
            results['listModels'] = { error: listErr.message };
        }

        // 2. Probar diferentes modelos con el SDK (que usa v1beta por defecto)
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-pro'
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Di "OK"');
                const text = (await result.response).text();
                results[modelName] = { version: 'v1beta', success: true, response: text };
                if (!modelUsed) modelUsed = modelName;
            } catch (err: any) {
                results[modelName] = { version: 'v1beta', success: false, error: err.message };
            }
        }

        // 3. Probar una llamada directa a v1 vía fetch (para ver si es un tema de versión de API)
        try {
            const v1Response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Di "OK V1"' }] }] })
            });
            const v1Data = await v1Response.json();
            results['v1_test_gemini_pro'] = v1Data;
        } catch (v1Err: any) {
            results['v1_test_gemini_pro'] = { success: false, error: v1Err.message };
        }

        const success = !!modelUsed || (results['v1_test_gemini_pro'] && !results['v1_test_gemini_pro'].error && !results['v1_test_gemini_pro'].error);

        return res.status(200).json({
            success,
            apiKeyPrefix,
            modelUsed,
            results,
            hints: [
                "Si 'listModels' sale vacío, el proyecto no tiene modelos habilitados.",
                "Si 'v1_test_gemini_pro' funciona pero el SDK no, es un problema de versión de API (v1beta vs v1).",
                "Si todo falla con 404, revisa si el país (Chile) tiene alguna restricción específica en esta cuenta."
            ]
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
