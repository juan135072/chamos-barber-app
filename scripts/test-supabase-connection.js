#!/usr/bin/env node

/**
 * Test Script para verificar conexión a Supabase VPS
 * Prueba tanto la conexión con anon_key como con service_role_key
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔧 Configuración de Supabase VPS');
console.log('================================');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Anon Key: ${SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ No encontrado'}`);
console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ No encontrado'}`);

async function testConnection() {
  console.log('\n📡 Probando conexión con Anon Key...');
  
  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: tables, error: tablesError } = await supabaseAnon
      .from('admin_users')
      .select('count', { count: 'exact', head: true });
    
    if (tablesError) {
      console.log('❌ Error con Anon Key:', tablesError.message);
    } else {
      console.log('✅ Conexión con Anon Key exitosa');
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }

  console.log('\n📡 Probando conexión con Service Role Key...');
  
  try {
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data: tablesData, error: tablesError } = await supabaseService
      .from('admin_users')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.log('❌ Error con Service Key:', tablesError.message);
    } else {
      console.log('✅ Conexión con Service Role Key exitosa');
      console.log('📊 Base de datos accesible');
    }

    console.log('\n📋 Tablas disponibles en la base de datos:');
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
      const { count, error } = await supabaseService
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ ${table}: ${count} registros`);
      } else {
        console.log(`  ❌ ${table}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

testConnection().then(() => {
  console.log('\n✅ Test completado\n');
}).catch((err) => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
