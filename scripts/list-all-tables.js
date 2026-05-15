#!/usr/bin/env node

/**
 * Script para listar TODAS las tablas disponibles en Supabase
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

async function listAllTables() {
  console.log('🔍 Listando TODAS las tablas disponibles en Supabase...\n');

  try {
    // Intentar hacer una llamada a la API raíz para ver qué endpoints están disponibles
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('📋 Tablas/endpoints disponibles:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('⚠️ No se pudo obtener la lista directamente');
    }

    console.log('\n---\n');

    // Intentar consultar tablas comunes
    const commonTables = [
      'solicitudes_barberos',
      'solicitudes',
      'barberos',
      'servicios',
      'categorias_servicios',
      'citas',
      'admin_users',
      'clientes'
    ];

    console.log('🔍 Verificando tablas comunes:\n');

    for (const tableName of commonTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${tableName}: ${error.code} - ${error.message}`);
        } else {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          console.log(`✅ ${tableName}: existe (${columns.length} columnas)`);
          if (columns.length > 0) {
            console.log(`   Columnas: ${columns.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`💥 ${tableName}: error - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error.message);
  }

  console.log('\n✅ Verificación completada\n');
}

listAllTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
