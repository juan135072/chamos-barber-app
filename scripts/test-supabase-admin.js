/**
 * Script para probar la conexión administrativa con Supabase (Bypass RLS)
 * 
 * Este script utiliza la SERVICE_ROLE_KEY para realizar operaciones que
 * normalmente están restringidas por políticas de seguridad (RLS).
 */

const { createClient } = require('@supabase/supabase-js');
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontradas.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testAdminConnection() {
    console.log(`📡 Conectando como ADMINISTRADOR a: ${SUPABASE_URL}`);

    try {
        // 1. Probar lectura de una tabla crítica (barberos) para verificar acceso
        const { data: barberos, error: bError, count } = await supabase
            .from('barberos')
            .select('*', { count: 'exact', head: true });

        if (bError) throw bError;

        console.log('✅ Conexión a la base de datos exitosa (Table Access)');
        console.log(`📊 Se encontraron ${count} barberos registrados.`);

        // 2. Probar acceso a Auth (esto solo funciona con Service Role)
        console.log('🔐 Probando acceso administrativo a Auth...');
        const { data: users, error: uError } = await supabase.auth.admin.listUsers();

        if (uError) {
            console.warn('⚠️ No se pudo listar usuarios de Auth (esto es normal si el endpoint de gestión no está expuesto)');
        } else {
            console.log(`✅ ¡Éxito! Se encontraron ${users.users.length} usuarios en el sistema de autenticación.`);
        }

    } catch (error) {
        console.error('❌ Error en la conexión administrativa:');
        console.error(`   Mensaje: ${error.message}`);
        process.exit(1);
    }
}

testAdminConnection();
