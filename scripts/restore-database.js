#!/usr/bin/env node

/**
 * Script para restaurar la base de datos desde un backup JSON
 * Lee el archivo de backup y restaura los datos en la instancia de Supabase configurada en .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Orden de restauración para respetar claves foráneas
const TABLE_ORDER = [
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

async function restoreTable(tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`⚠️  Tabla ${tableName}: Sin datos para restaurar`);
    return;
  }

  console.log(`\n📦 Restaurando tabla: ${tableName} (${rows.length} registros)`);
  
  // Insertar en lotes para evitar timeouts o límites de tamaño
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.log(`  ❌ Error en lote ${i/BATCH_SIZE + 1}: ${error.message}`);
        errorCount += batch.length;
      } else {
        process.stdout.write('.');
        successCount += batch.length;
      }
    } catch (err) {
      console.log(`  ❌ Error inesperado: ${err.message}`);
      errorCount += batch.length;
    }
  }
  
  console.log(`\n  ✅ Completado: ${successCount} insertados/actualizados, ${errorCount} fallidos`);
}

async function main() {
  // Obtener archivo de backup (último argumento o buscar el más reciente)
  let backupFile = process.argv[2];

  if (!backupFile) {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length > 0) {
        backupFile = path.join(backupDir, files[0]);
        console.log(`ℹ️  Usando el backup más reciente: ${files[0]}`);
      }
    }
  }

  if (!backupFile) {
    console.error('❌ Error: No se especificó archivo de backup y no se encontró ninguno reciente.');
    console.log('Uso: node scripts/restore-database.js <ruta-al-backup.json>');
    process.exit(1);
  }

  console.log('\n🔄 Iniciando Restauración de Base de Datos');
  console.log('='.repeat(60));
  console.log(`📂 Archivo: ${backupFile}`);
  console.log(`🎯 Destino: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  try {
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    const backup = JSON.parse(backupContent);

    console.log(`📅 Fecha del backup: ${backup.metadata.timestamp}`);
    console.log(`📊 Tablas en backup: ${Object.keys(backup.tables).length}`);

    // Confirmación (simulada, ya que es script)
    console.log('\n⚠️  ADVERTENCIA: Esto sobrescribirá datos existentes con el mismo ID.');
    console.log('⏳ Iniciando en 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    for (const table of TABLE_ORDER) {
      if (backup.tables[table]) {
        await restoreTable(table, backup.tables[table]);
      } else {
        console.log(`\n⚠️  Tabla ${table} no encontrada en el backup, saltando...`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Restauración completada');
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  }
}

main();
