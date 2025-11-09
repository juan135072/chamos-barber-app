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
      
      // Si falla exec_sql, podríamos estar usando una instancia self-hosted
      // sin la función RPC. En ese caso, el usuario debe ejecutar manualmente.
      console.log('\n💡 Sugerencia:');
      console.log('   Tu instancia de Supabase parece ser self-hosted sin RPC habilitado.');
      console.log('   Por favor, ejecuta las migraciones manualmente:');
      console.log(`   1. Abre ${supabaseUrl}/`);
      console.log('   2. Ve al SQL Editor');
      console.log(`   3. Copia y ejecuta: supabase/migrations/${migrationFile}\n`);
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('🏪 SISTEMA POS - EJECUCIÓN DE MIGRACIONES SQL');
  console.log('🚀'.repeat(30) + '\n');

  console.log('📡 Conectando a Supabase...');
  console.log(`🔗 URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey.substring(0, 20)}...`);
  console.log('');

  // Ejecutar migraciones
  const migration1Success = await executeMigrationDirect(
    'add_pos_system.sql',
    'Sistema POS y Facturación'
  );

  const migration2Success = await executeMigrationDirect(
    'add_cajero_role.sql',
    'Rol de Cajero y Permisos'
  );

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIONES');
  console.log('='.repeat(60) + '\n');
  console.log(`1. Sistema POS:      ${migration1Success ? '✅ EXITOSO' : '❌ REQUIERE EJECUCIÓN MANUAL'}`);
  console.log(`2. Roles y Permisos: ${migration2Success ? '✅ EXITOSO' : '❌ REQUIERE EJECUCIÓN MANUAL'}`);
  console.log('');

  if (!migration1Success || !migration2Success) {
    console.log('\n📋 INSTRUCCIONES PARA EJECUCIÓN MANUAL:');
    console.log('─'.repeat(60));
    console.log(`\n1. Abre tu Supabase Studio:`);
    console.log(`   ${supabaseUrl}/`);
    console.log(`   Usuario: (tu usuario)`);
    console.log(`   Contraseña: ${process.env.SUPABASE_STUDIO_PASSWORD || '(ver .env.local)'}`);
    console.log('');
    console.log('2. Ve a la sección "SQL Editor" en el menú lateral');
    console.log('');
    console.log('3. Crea una nueva query y ejecuta (en orden):');
    console.log('');
    console.log('   a) Primera migración: add_pos_system.sql');
    console.log('      Ruta: supabase/migrations/add_pos_system.sql');
    console.log('      Copia el contenido completo y ejecuta');
    console.log('');
    console.log('   b) Segunda migración: add_cajero_role.sql');
    console.log('      Ruta: supabase/migrations/add_cajero_role.sql');
    console.log('      Copia el contenido completo y ejecuta');
    console.log('');
    console.log('4. Verifica que las tablas fueron creadas:');
    console.log('   - public.facturas');
    console.log('   - public.configuracion_comisiones');
    console.log('   - public.roles_permisos');
    console.log('');
    console.log('5. Verifica que las vistas fueron creadas:');
    console.log('   - public.ventas_diarias_por_barbero');
    console.log('   - public.cierre_caja_diario');
    console.log('   - public.usuarios_con_permisos');
    console.log('');
    console.log('─'.repeat(60));
    console.log('\n💡 Una vez ejecutadas manualmente, continúa con el desarrollo frontend\n');
  } else {
    console.log('🎉 ¡Todas las migraciones se ejecutaron correctamente!\n');
  }
}

main();
