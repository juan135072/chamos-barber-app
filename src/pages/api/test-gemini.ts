import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

        console.log('🔑 API Key exists:', !!apiKey)
        console.log('🔑 API Key length:', apiKey?.length || 0)
        console.log('🔑 API Key prefix:', apiKey?.substring(0, 10))

        if (!apiKey) {
            return res.status(500).json({
                error: 'API key not configured',
                env: process.env.GOOGLE_GENERATIVE_AI_API_KEY
            })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        console.log('🤖 Model created, generating content...')

        const prompt = "Di 'Hola' en una palabra"

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        console.log('✅ Response:', text)

        return res.status(200).json({
            success: true,
            prompt: prompt,
            response: text,
            apiKeyConfigured: true,
            apiKeyLength: apiKey.length,
        })
    } catch (error: any) {
        console.error('❌ Error:', error)

        return res.status(500).json({
            error: 'Failed to call Gemini',
            message: error.message,
            details: error.toString(),
            stack: error.stack,
        })
    }
}
