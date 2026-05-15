#!/usr/bin/env node

/**
 * Script para ejecutar el fix de RLS en la tabla citas
 * Crea la política que permite INSERT público
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔧 EJECUTANDO FIX DE RLS PARA TABLA CITAS\n');
console.log('━'.repeat(60));

async function executeRLSFix() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('\n1️⃣  Verificando acceso a Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('citas')
      .select('id')
      .limit(1);
    
    if (testError) {
      throw new Error(`No se puede acceder a la tabla citas: ${testError.message}`);
    }
    console.log('✅ Acceso confirmado');
    
    // Probar el problema actual
    console.log('\n2️⃣  Verificando problema actual (INSERT con ANON KEY)...');
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const testCita = {
      servicio_id: '4fa76cbe-d7a0-4d4b-b3fd-f3bb6bf752b3',
      barbero_id: '0d268607-78fa-49b6-9efe-2ab78735be83',
      fecha: '2025-11-08',
      hora: '15:00',
      cliente_nombre: 'Test Pre-Fix',
      cliente_telefono: '+56999999999',
      estado: 'pendiente'
    };
    
    const { error: preFixError } = await supabaseAnon
      .from('citas')
      .insert([testCita]);
    
    if (preFixError) {
      if (preFixError.code === '42501') {
        console.log('❌ Confirmado: Error 42501 (RLS policy violation)');
        console.log('   Este es el problema que vamos a resolver');
      } else {
        console.log('⚠️  Error diferente:', preFixError.message);
      }
    } else {
      console.log('✅ ¡Sorpresa! Ya funciona. Tal vez la política ya existe.');
      console.log('   Verificando si la política existe...');
    }
    
    // Ejecutar SQL para crear la política
    console.log('\n3️⃣  Ejecutando SQL para crear política RLS...');
    
    // Supabase JS no permite ejecutar CREATE POLICY directamente
    // Tenemos que usar la API REST de PostgreSQL a través de Supabase
    
    console.log('⚠️  IMPORTANTE: Supabase JS no permite ejecutar CREATE POLICY directamente');
    console.log('');
    console.log('💡 SOLUCIONES ALTERNATIVAS:');
    console.log('');
    console.log('OPCIÓN A: Usar SQL Editor de Supabase Studio');
    console.log('  1. Ir a: https://supabase.chamosbarber.com');
    console.log('  2. SQL Editor → New Query');
    console.log('  3. Pegar el siguiente SQL:');
    console.log('');
    console.log('━'.repeat(60));
    console.log('CREATE POLICY IF NOT EXISTS "allow_public_insert_citas"');
    console.log('ON public.citas');
    console.log('FOR INSERT');
    console.log('TO anon, authenticated');
    console.log('WITH CHECK (true);');
    console.log('━'.repeat(60));
    console.log('');
    console.log('OPCIÓN B: Deshabilitar RLS temporalmente (NO RECOMENDADO)');
    console.log('  ALTER TABLE public.citas DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('OPCIÓN C: Usar API Route con SERVICE_ROLE_KEY');
    console.log('  (Ya implementado en backup-before-reset-20251106-150547)');
    console.log('');
    
    // Intentar una solución alternativa: crear una función RPC
    console.log('\n4️⃣  Intentando solución alternativa: Crear función RPC...');
    
    try {
      // Primero, verificar si existe una función para ejecutar SQL
      const { data: rpcTest, error: rpcError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE POLICY IF NOT EXISTS "allow_public_insert_citas"
          ON public.citas
          FOR INSERT
          TO anon, authenticated
          WITH CHECK (true);
        `
      });
      
      if (rpcError) {
        console.log('❌ No existe función exec_sql:', rpcError.message);
        console.log('');
        console.log('💡 Para crear la función exec_sql, ejecuta en SQL Editor:');
        console.log('');
        console.log('━'.repeat(60));
        console.log('CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)');
        console.log('RETURNS TEXT AS $$');
        console.log('BEGIN');
        console.log('  EXECUTE sql_query;');
        console.log('  RETURN \'Success\';');
        console.log('END;');
        console.log('$$ LANGUAGE plpgsql SECURITY DEFINER;');
        console.log('━'.repeat(60));
      } else {
        console.log('✅ Función exec_sql ejecutada');
        console.log('📊 Resultado:', rpcTest);
      }
    } catch (e) {
      console.log('❌ Error ejecutando RPC:', e.message);
    }
    
    // Probar si el fix funcionó
    console.log('\n5️⃣  Probando si el problema se resolvió...');
    
    const testCita2 = {
      ...testCita,
      hora: '16:00',
      cliente_nombre: 'Test Post-Fix'
    };
    
    const { data: postFixData, error: postFixError } = await supabaseAnon
      .from('citas')
      .insert([testCita2])
      .select();
    
    if (postFixError) {
      console.log('❌ Problema persiste:', postFixError.message);
      console.log('');
      console.log('📝 RESUMEN:');
      console.log('  El fix debe ejecutarse manualmente en Supabase SQL Editor');
      console.log('  Archivo: supabase/fix-rls-citas.sql');
      console.log('');
      return false;
    } else {
      console.log('✅ ¡PROBLEMA RESUELTO! Cita creada exitosamente');
      console.log('📊 Cita ID:', postFixData[0].id);
      
      // Limpiar la cita de prueba
      await supabase.from('citas').delete().eq('id', postFixData[0].id);
      console.log('🗑️  Cita de prueba eliminada');
      
      console.log('');
      console.log('🎉 ¡El sistema de reservas ahora funciona correctamente!');
      return true;
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return false;
  }
}

executeRLSFix().then(success => {
  console.log('\n━'.repeat(60));
  if (success) {
    console.log('✅ Fix completado exitosamente\n');
    process.exit(0);
  } else {
    console.log('⚠️  Fix requiere ejecución manual en SQL Editor\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
