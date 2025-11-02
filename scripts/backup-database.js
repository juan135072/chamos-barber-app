#!/usr/bin/env node

/**
 * Script para hacer backup completo de la base de datos Supabase VPS
 * Exporta todas las tablas a archivos JSON
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

async function backupTable(tableName) {
  console.log(`\n📦 Haciendo backup de: ${tableName}`);
  
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
      return null;
    }

    console.log(`  ✅ ${count} registros exportados`);
    return { table: tableName, count, data };

  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return null;
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  console.log('\n🗄️  Iniciando Backup de Chamos Barber Database');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${timestamp}`);

  // Crear directorio de backups si no existe
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`\n📁 Directorio de backups creado: ${backupDir}`);
  }

  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      source: SUPABASE_URL,
      tables: TABLES.length
    },
    tables: {}
  };

  let totalRecords = 0;

  for (const table of TABLES) {
    const result = await backupTable(table);
    if (result) {
      backup.tables[result.table] = result.data;
      totalRecords += result.count;
    }
  }

  // Guardar backup
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Backup completado exitosamente');
  console.log(`📊 Total de registros: ${totalRecords}`);
  console.log(`💾 Archivo: ${backupFile}`);
  console.log(`📦 Tamaño: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
  console.log('='.repeat(60) + '\n');

  return backupFile;
}

createBackup().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
