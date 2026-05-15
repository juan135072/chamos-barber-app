#!/usr/bin/env node

/**
 * Visualiza una tabla de la base de datos en la terminal
 * Uso: npm run db:view admin_users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLES = [
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

async function viewTable(tableName, limit = 10) {
  if (!TABLES.includes(tableName)) {
    console.log(`\n❌ Tabla '${tableName}' no encontrada`);
    console.log('\n📋 Tablas disponibles:');
    TABLES.forEach(t => console.log(`  - ${t}`));
    console.log('\nUso: npm run db:view <tabla> [límite]');
    console.log('Ejemplo: npm run db:view barberos 5\n');
    return;
  }

  console.log(`\n📊 Visualizando tabla: ${tableName}`);
  console.log('='.repeat(80));

  try {
    // Obtener datos
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) {
      console.log(`❌ Error: ${error.message}\n`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`\n⚠️  Tabla vacía (0 registros)\n`);
      return;
    }

    // Mostrar información
    console.log(`\n📈 Total de registros: ${count}`);
    console.log(`👁️  Mostrando: ${data.length} registros`);
    
    // Obtener columnas
    const columns = Object.keys(data[0]);
    console.log(`📝 Columnas (${columns.length}): ${columns.join(', ')}`);
    
    console.log('\n' + '='.repeat(80));
    
    // Mostrar tabla
    console.table(data);
    
    if (count > limit) {
      console.log(`\n💡 Hay ${count - limit} registros más. Usa: npm run db:view ${tableName} ${count}`);
    }
    
    console.log('');

  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
  }
}

// Parsear argumentos
const tableName = process.argv[2];
const limit = parseInt(process.argv[3]) || 10;

if (!tableName) {
  console.log('\n📋 Tablas disponibles en la base de datos:');
  console.log('='.repeat(60));
  TABLES.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log('\n💡 Uso: npm run db:view <tabla> [límite]');
  console.log('Ejemplo: npm run db:view barberos 5\n');
} else {
  viewTable(tableName, limit);
}
