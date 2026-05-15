const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

async function setupKnowledgeBase() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: GEMINI_API_KEY no encontrada en .env.local");
        process.exit(1);
    }

    const fileManager = new GoogleAIFileManager(apiKey);
    const manualsDir = path.join(__dirname, "../manuals");

    // Verificar si existe la carpeta manuals
    if (!fs.existsSync(manualsDir)) {
        console.error("❌ Error: No se encontró la carpeta 'manuals'.");
        console.log("👉 Por favor, crea una carpeta llamada 'manuals' en la raíz y coloca tus PDFs ahí.");
        process.exit(1);
    }

    // Leer archivos PDF
    const files = fs.readdirSync(manualsDir).filter(file => file.toLowerCase().endsWith(".pdf"));

    if (files.length === 0) {
        console.warn("⚠️ Advertencia: La carpeta 'manuals' está vacía o no tiene archivos PDF.");
        return;
    }

    console.log(`📂 Encontrados ${files.length} manuales. Subiendo a Google AI...`);

    const uploadPromises = files.map(async (file) => {
        const filePath = path.join(manualsDir, file);
        try {
            const uploadResponse = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: file,
            });
            console.log(`✅ Subido: ${uploadResponse.file.displayName} (URI: ${uploadResponse.file.uri})`);
            return uploadResponse.file;
        } catch (error) {
            console.error(`❌ Error subiendo ${file}:`, error.message);
            return null;
        }
    });

    const uploadedFiles = (await Promise.all(uploadPromises)).filter(f => f !== null);

    if (uploadedFiles.length > 0) {
        console.log("\n🎉 ¡Éxito! Los manuales se han subido al almacenamiento de Google AI.");
        console.log("📝 Guarda estos URIs, los usaremos para que el agente Gustavo lea los manuales.");
        // Aquí podríamos guardar los URIs en un JSON o base de datos si fuera necesario
        // Por ahora, solo informamos
    }
}

setupKnowledgeBase();
