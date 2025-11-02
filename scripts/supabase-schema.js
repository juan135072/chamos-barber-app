#!/usr/bin/env node

/**
 * Script para explorar el schema completo de Supabase VPS
 * Muestra tablas, columnas, tipos de datos y relaciones
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getTableSchema(tableName) {
  console.log(`\n📋 Tabla: ${tableName}`);
  console.log('='.repeat(50));

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`  Columnas (${columns.length}):`);
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`    - ${col}: ${type}`);
      });
    } else {
      console.log('  ⚠️ Tabla vacía, consultando estructura...');
      
      // Intentar obtener una fila para ver estructura
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sample && sample.length === 0) {
        console.log('    No hay datos para inferir estructura');
      }
    }

    // Contar registros
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    console.log(`  📊 Registros: ${count}`);

  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
}

async function exploreDatabase() {
  console.log('\n🗄️  Explorando Base de Datos de Chamos Barber');
  console.log('=' .repeat(60));

  const tables = [
    'admin_users',
    'barberos',
    'servicios',
    'citas',
    'horarios_trabajo',
    'barbero_portfolio',
    'portfolio_galerias',
    'sitio_configuracion',
    'estadisticas'
  ];

  for (const table of tables) {
    await getTableSchema(table);
  }

  console.log('\n✅ Exploración completada\n');
}

exploreDatabase().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
