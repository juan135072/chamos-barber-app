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
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent('Di "Conectado" en una palabra.');
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({
            success: true,
            status: 'connected',
            response: text,
            router: 'pages',
            sdk: 'official-google',
            apiKeyLength: apiKey.length,
            apiKeyPrefix: apiKey.substring(0, 10) + '...'
        });
    } catch (error: any) {
        console.error('[TEST-GEMINI] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
