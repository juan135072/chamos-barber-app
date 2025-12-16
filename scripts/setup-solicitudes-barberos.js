#!/usr/bin/env node

/**
 * Script para habilitar la funcionalidad de solicitudes_barberos
 * Ejecuta los scripts SQL necesarios en Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile(filePath, description) {
  console.log(`\n📄 Ejecutando: ${description}`);
  console.log(`   Archivo: ${filePath}`);

  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Nota: Supabase JS client no soporta ejecución directa de SQL
    // Necesitamos usar la API REST de PostgREST que no permite DDL
    // La mejor opción es usar la función RPC si existe o conectar directo a PostgreSQL
    
    console.log('⚠️  El cliente de Supabase JS no soporta ejecución de SQL DDL directamente.');
    console.log('📋 Contenido del SQL a ejecutar:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60));
    
    return { success: false, needsManual: true };
  } catch (error) {
    console.error(`❌ Error leyendo archivo ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function checkTableExists() {
  console.log('\n🔍 Verificando si la tabla existe...');
  
  try {
    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ La tabla solicitudes_barberos NO existe');
        return false;
      }
      throw error;
    }

    console.log('✅ La tabla solicitudes_barberos YA existe');
    return true;
  } catch (error) {
    console.error('Error verificando tabla:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando configuración de solicitudes_barberos...\n');
  
  // 1. Verificar si la tabla existe
  const tableExists = await checkTableExists();

  if (tableExists) {
    console.log('\n✅ La funcionalidad ya está habilitada');
    console.log('📋 Puedes acceder a la pestaña de Solicitudes en el panel admin');
    process.exit(0);
  }

  console.log('\n📋 INSTRUCCIONES PARA HABILITAR LA FUNCIONALIDAD:\n');
  console.log('La tabla solicitudes_barberos necesita ser creada en Supabase.');
  console.log('Dado que el cliente JS no soporta DDL, debes ejecutar el SQL manualmente.\n');
  
  console.log('🔧 OPCIÓN 1: Usando Supabase Dashboard (Recomendado)');
  console.log('─'.repeat(60));
  console.log('1. Abre: https://supabase.chamosbarber.com');
  console.log('2. Ve a: SQL Editor');
  console.log('3. Copia y pega el contenido de:');
  console.log('   - scripts/SQL/create-solicitudes-barberos-table.sql');
  console.log('   - scripts/SQL/create-aprobar-barbero-function.sql');
  console.log('4. Ejecuta cada script');
  console.log('5. Verifica que no haya errores\n');

  console.log('🔧 OPCIÓN 2: Usando psql (Avanzado)');
  console.log('─'.repeat(60));
  console.log('1. Conecta a PostgreSQL con psql');
  console.log('2. Ejecuta:');
  console.log('   \\i scripts/SQL/create-solicitudes-barberos-table.sql');
  console.log('   \\i scripts/SQL/create-aprobar-barbero-function.sql\n');

  console.log('🔧 OPCIÓN 3: API HTTP (Programático)');
  console.log('─'.repeat(60));
  console.log('1. Usa la API de gestión de Supabase');
  console.log('2. O conecta directamente vía string de conexión PostgreSQL\n');

  // Mostrar ubicación de archivos
  const sqlDir = path.join(__dirname, 'SQL');
  console.log('📁 Archivos SQL ubicados en:');
  console.log(`   ${sqlDir}/`);
  console.log('   - create-solicitudes-barberos-table.sql');
  console.log('   - create-aprobar-barbero-function.sql\n');

  // Mostrar el SQL directamente
  console.log('📋 CONTENIDO DEL SQL (create-solicitudes-barberos-table.sql):');
  console.log('═'.repeat(60));
  const sqlFile1 = path.join(sqlDir, 'create-solicitudes-barberos-table.sql');
  const sql1 = fs.readFileSync(sqlFile1, 'utf8');
  console.log(sql1);
  console.log('═'.repeat(60));

  console.log('\n📋 CONTENIDO DEL SQL (create-aprobar-barbero-function.sql):');
  console.log('═'.repeat(60));
  const sqlFile2 = path.join(sqlDir, 'create-aprobar-barbero-function.sql');
  const sql2 = fs.readFileSync(sqlFile2, 'utf8');
  console.log(sql2);
  console.log('═'.repeat(60));

  console.log('\n✅ Para verificar que funcionó, ejecuta:');
  console.log('   node scripts/setup-solicitudes-barberos.js\n');
}

main()
  .then(() => {
    console.log('\n✨ Script completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
