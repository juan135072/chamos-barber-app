const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno');
    console.error('supabaseUrl defined:', !!supabaseUrl);
    console.error('supabaseServiceKey defined:', !!supabaseServiceKey);
    console.log('Available SUPABASE keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

async function executeSQLDirect(sql) {
    return new Promise((resolve, reject) => {
        const url = new URL('/rest/v1/rpc/exec_sql', supabaseUrl);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const postData = JSON.stringify({ query: sql });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            }
        };

        const req = httpModule.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: data });
                } else {
                    resolve({ success: false, error: data, statusCode: res.statusCode });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function executeMigrationDirect(migrationFile, description) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Ejecutando: ${description}`);
    console.log(`📁 Archivo: ${migrationFile}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('📖 Contenido SQL cargado correctamente');
        console.log(`📏 Tamaño: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

        console.log('⚙️  Ejecutando SQL en Supabase...\n');

        // Intentar ejecutar SQL completo
        const result = await executeSQLDirect(sqlContent);

        if (result.success) {
            console.log('✅ Migración ejecutada exitosamente!\n');
            if (result.data) {
                try {
                    const parsed = JSON.parse(result.data);
                    console.log('📊 Resultado:', parsed);
                } catch {
                    console.log('📊 Resultado:', result.data.substring(0, 200));
                }
            }
            return true;
        } else {
            console.log(`⚠️  Status Code: ${result.statusCode}`);
            console.log(`⚠️  Error: ${result.error.substring(0, 500)}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        return false;
    }
}

async function main() {
    console.log('\n' + '🚀'.repeat(30));
    console.log('💰 GESTIÓN DE GASTOS - EJECUCIÓN DE MIGRACIÓN');
    console.log('🚀'.repeat(30) + '\n');

    console.log('📡 Conectando a Supabase...');
    console.log(`🔗 URL: ${supabaseUrl}`);

    // Ejecutar migración de gastos
    const success = await executeMigrationDirect(
        '20260113_create_gastos_schema.sql',
        'Esquema de Gastos y Categorías'
    );

    console.log('\n' + '='.repeat(60));
    console.log(`RESULTADO FINAL: ${success ? '✅ EXITOSO' : '❌ FALLIDO'}`);
    console.log('='.repeat(60) + '\n');
}

main();
