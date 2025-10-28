#!/usr/bin/env node

/**
 * Script para ejecutar consultas SQL directas en Supabase VPS
 * Uso: node scripts/supabase-query.js "SELECT * FROM admin_users"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeQuery(query) {
  console.log('\n🔍 Ejecutando consulta...');
  console.log(`Query: ${query}\n`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log('✅ Resultado:');
    console.table(data);
    console.log(`\n📊 ${data?.length || 0} registros encontrados\n`);
    
  } catch (err) {
    console.error('❌ Error ejecutando query:', err.message);
  }
}

const query = process.argv[2];

if (!query) {
  console.log('\n❌ Debes proporcionar una consulta SQL');
  console.log('Uso: node scripts/supabase-query.js "SELECT * FROM tabla"\n');
  process.exit(1);
}

executeQuery(query);
