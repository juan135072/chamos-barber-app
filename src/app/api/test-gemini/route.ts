import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function GET() {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'API Key missing in environment variables'
            }, { status: 500 });
        }

        console.log('[TEST-GEMINI] Testing Gemini API...');

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: 'Di "Conectado" en una palabra.',
        });

        return NextResponse.json({
            success: true,
            status: 'connected',
            response: text,
            model: 'gemini-1.5-flash',
            apiKeyLength: apiKey.length,
            apiKeyPrefix: apiKey.substring(0, 10) + '...'
        });
    } catch (error: any) {
        console.error('[TEST-GEMINI] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
