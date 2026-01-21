/**
 * Utility for audio transcription using OpenAI Whisper (Local or via Groq)
 */

export async function transcribeAudio(base64: string, mimeType: string): Promise<string> {
    const WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:9000/asr';
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        // 1. Try Local Whisper (Coolify) or Custom Endpoint
        if (process.env.WHISPER_URL || !GROQ_API_KEY) {
            console.log(`[TRANSCRIPCIÓN] Intentando con servicio local: ${WHISPER_URL}`);

            // Conversion from base64 to Blob for FormData
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const formData = new FormData();
            formData.append('audio_file', blob, `audio.${mimeType.split('/')[1] || 'ogg'}`);

            const response = await fetch(`${WHISPER_URL}?task=transcribe&output=json`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                return data.text || '[Audio vacío o sin voz detectable]';
            }

            console.warn(`[TRANSCRIPCIÓN] Servicio local falló (status: ${response.status}).`);
            if (!GROQ_API_KEY) throw new Error('Local Whisper failed and no Groq API Key provided.');
        }

        // 2. Fallback to Groq Cloud (Free Whisper)
        if (GROQ_API_KEY) {
            console.log('[TRANSCRIPCIÓN] Usando fallback: Groq Cloud Whisper');

            // Groq needs a File/Blob as well
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const formData = new FormData();
            formData.append('file', blob, `audio.${mimeType.split('/')[1] || 'ogg'}`);
            formData.append('model', 'whisper-large-v3');

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Groq API Error: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.text;
        }

        return '[Error: No se pudo transcribir el audio]';
    } catch (error) {
        console.error('[TRANSCRIPCIÓN] Error crítico:', error);
        return '[Error técnico al procesar audio]';
    }
}
