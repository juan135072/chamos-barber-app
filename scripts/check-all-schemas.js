#!/usr/bin/env node

/**
 * Script para verificar la estructura real de TODAS las tablas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'categorias_servicios',
  'servicios',
  'barberos',
  'citas',
  'admin_users'
];

async function checkAllSchemas() {
  console.log('🔍 Verificando estructura de TODAS las tablas...\n');

  for (const tableName of tables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Tabla: ${tableName}`);
    console.log('='.repeat(60));

    try {
      // Consultar 1 registro para ver columnas
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Error: ${error.message}`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log('⚠️  Tabla vacía o no existe');
        continue;
      }

      const columns = Object.keys(data[0]);
      console.log(`✅ Columnas encontradas (${columns.length}):`);
      console.log(columns.map(col => `  - ${col}`).join('\n'));
      
      console.log('\n📊 Ejemplo de registro:');
      console.log(JSON.stringify(data[0], null, 2));
    } catch (err) {
      console.error(`💥 Error general:`, err.message);
    }
  }

  console.log(`\n${'='.repeat(60)}\n`);
  console.log('✅ Verificación completada\n');
}

checkAllSchemas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
