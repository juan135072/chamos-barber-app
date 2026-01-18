/**
 * Script para probar la conexión con la API de Coolify
 * 
 * Uso: 
 * 1. Crea un archivo .env con:
 *    COOLIFY_API_KEY=tu_api_key
 *    COOLIFY_URL=https://coolify.chamosbarber.com
 * 2. Ejecuta: node scripts/test-coolify-api.js
 */

const path = require('path');
const fs = require('fs');

// Intentar cargar .env.local primero, luego .env
const envFiles = ['.env.local', '.env'];
envFiles.forEach(file => {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
});

const API_KEY = process.env.COOLIFY_API_KEY;
const BASE_URL = process.env.COOLIFY_URL || 'https://coolify.chamosbarber.com';

async function testConnection() {
    if (!API_KEY) {
        console.error('❌ Error: COOLIFY_API_KEY no encontrada en el archivo .env');
        process.exit(1);
    }

    console.log(`📡 Probando conexión a: ${BASE_URL}/api/v1/projects`);

    try {
        const response = await fetch(`${BASE_URL}/api/v1/projects`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error al conectar con la API de Coolify:');
            console.error(`   Status: ${response.status}`);
            console.error(`   Data:`, errorData);
            process.exit(1);
        }

        const data = await response.json();

        console.log('✅ Conexión exitosa!');
        console.log(`📂 Se encontraron ${data.length} proyectos:`);
        data.forEach(project => {
            console.log(`   - ${project.name} (UUID: ${project.uuid})`);
        });

    } catch (error) {
        console.error('❌ Error inesperado:');
        console.error(`   Mensaje: ${error.message}`);
        process.exit(1);
    }
}

testConnection();
