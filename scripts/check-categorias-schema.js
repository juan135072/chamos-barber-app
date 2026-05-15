#!/usr/bin/env node

/**
 * Script para verificar la estructura real de la tabla categorias_servicios
 * y diagnosticar el problema con la columna 'activa'
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

async function checkSchema() {
  console.log('🔍 Verificando estructura de categorias_servicios...\n');

  try {
    // 1. Intentar SELECT * para ver qué columnas existen
    console.log('📋 Paso 1: Consultando todas las columnas...');
    const { data: allData, error: allError } = await supabase
      .from('categorias_servicios')
      .select('*')
      .limit(1);

    if (allError) {
      console.error('❌ Error en SELECT *:', allError);
    } else if (allData && allData.length > 0) {
      console.log('✅ Columnas encontradas:', Object.keys(allData[0]));
      console.log('📊 Ejemplo de registro:', allData[0]);
    } else {
      console.log('⚠️ La tabla está vacía o no existe');
    }

    console.log('\n---\n');

    // 2. Verificar específicamente la columna 'activa'
    console.log('📋 Paso 2: Intentando SELECT con columna activa...');
    const { data: activaData, error: activaError } = await supabase
      .from('categorias_servicios')
      .select('id, nombre, activa')
      .limit(3);

    if (activaError) {
      console.error('❌ Error con columna activa:', activaError);
      console.log('\n🔍 Posibles causas:');
      console.log('  1. La columna no existe en la tabla');
      console.log('  2. El nombre de la columna es diferente');
      console.log('  3. El schema cache necesita recargarse');
    } else {
      console.log('✅ Columna activa existe y funciona:', activaData);
    }

    console.log('\n---\n');

    // 3. Consultar el information_schema para ver la estructura real
    console.log('📋 Paso 3: Consultando información del schema de PostgreSQL...');
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categorias_servicios'
        ORDER BY ordinal_position;
      `
    });

    if (schemaError) {
      console.log('⚠️ No se pudo consultar information_schema (puede necesitar permisos)');
      console.log('Error:', schemaError);
    } else {
      console.log('✅ Estructura de la tabla según PostgreSQL:');
      console.table(schemaData);
    }

    console.log('\n---\n');

    // 4. Intentar UPDATE para diagnosticar el problema
    console.log('📋 Paso 4: Intentando UPDATE de prueba (sin cambios reales)...');
    const { data: updateData, error: updateError } = await supabase
      .from('categorias_servicios')
      .update({ activa: true })
      .eq('id', '00000000-0000-0000-0000-000000000000') // ID que no existe
      .select();

    if (updateError) {
      console.error('❌ Error en UPDATE:', updateError);
    } else {
      console.log('✅ UPDATE funcionaría (no se actualizó nada porque el ID no existe)');
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkSchema()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en verificación:', error);
    process.exit(1);
  });
