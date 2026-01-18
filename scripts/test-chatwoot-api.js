/**
 * Script para probar la conexión con la API de Chatwoot
 */

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
const envFiles = ['.env.local', '.env'];
envFiles.forEach(file => {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
});

const ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const BASE_URL = process.env.CHATWOOT_URL || 'https://chatwoot.chamosbarber.com';

async function testChatwootConnection() {
    if (!ACCESS_TOKEN) {
        console.error('❌ Error: CHATWOOT_ACCESS_TOKEN no encontrada en .env.local');
        process.exit(1);
    }

    console.log(`📡 Probando conexión a Chatwoot en: ${BASE_URL}`);

    try {
        // 1. Validar autenticación
        const profileRes = await fetch(`${BASE_URL}/api/v1/profile`, {
            headers: { 'api_access_token': ACCESS_TOKEN, 'Accept': 'application/json' }
        });

        if (!profileRes.ok) throw new Error(`Status ${profileRes.status}`);
        const profile = await profileRes.json();
        console.log(`✅ Autenticado como: ${profile.name}`);

        // 2. Listar cuentas
        const accountsRes = await fetch(`${BASE_URL}/api/v1/accounts`, {
            headers: { 'api_access_token': ACCESS_TOKEN, 'Accept': 'application/json' }
        });

        // El endpoint de /accounts para un usuario normal a veces devuelve un array 
        // pero en algunas versiones o configuraciones puede variar.
        const accounts = await accountsRes.json();

        // Si accounts no es un array, puede que el usuario solo tenga acceso a una cuenta
        // o que la estructura sea diferente.
        const accountList = Array.isArray(accounts) ? accounts : (accounts.payload || []);

        if (accountList.length === 0) {
            console.log('⚠️ No se listaron cuentas automáticamente. Probando cuenta ID 1 por defecto.');
            accountList.push({ id: 1, name: 'Default Account' });
        }

        console.log(`📂 Procesando ${accountList.length} cuentas:`);

        for (const acc of accountList) {
            console.log(`\n--- Cuenta: ${acc.name} (ID: ${acc.id}) ---`);

            const inboxesRes = await fetch(`${BASE_URL}/api/v1/accounts/${acc.id}/inboxes`, {
                headers: { 'api_access_token': ACCESS_TOKEN, 'Accept': 'application/json' }
            });

            if (inboxesRes.ok) {
                const inboxes = await inboxesRes.json();
                // Chatwoot suele devolver { payload: [...] } o [...]
                const list = Array.isArray(inboxes) ? inboxes : (inboxes.payload || []);
                console.log(`   📥 Bandejas: ${list.length}`);
                list.forEach(ib => {
                    console.log(`      - [${ib.channel_type}] ${ib.name} (ID: ${ib.id})`);
                });
            } else {
                console.log(`   ❌ Error al leer inboxes de cuenta ${acc.id}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testChatwootConnection();
