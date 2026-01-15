import type { NextApiRequest, NextApiResponse } from 'next';
import { generateChatResponse } from '@/lib/ai-agent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const response = await generateChatResponse('Hola ChamoBot, ¿estás vivo?');

        return res.status(200).json({
            success: true,
            message: 'ChamoBot está en línea y respondiendo.',
            aiResponse: response,
            config: {
                apiKeyFound: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
                modelUsed: 'gemini-flash-latest'
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
