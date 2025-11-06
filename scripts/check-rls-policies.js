#!/usr/bin/env node

/**
 * Script para verificar las políticas RLS de la tabla citas
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔒 VERIFICACIÓN DE RLS (Row Level Security) - Tabla CITAS\n');
console.log('━'.repeat(60));

async function checkRLSPolicies() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Verificar si RLS está habilitado
    console.log('\n1️⃣  Verificando si RLS está habilitado...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE tablename = 'citas';
      `
    });
    
    if (rlsError) {
      console.log('⚠️  No se puede usar exec_sql, usando método alternativo...');
      
      // Método alternativo: intentar hacer una query directa
      const { data: tableInfo } = await supabase
        .from('citas')
        .select('id')
        .limit(1);
      
      console.log('✅ Tabla "citas" accesible con SERVICE_ROLE_KEY');
      console.log('ℹ️  RLS está probablemente habilitado (pero se bypassa con service key)');
    } else {
      console.log('📊 Estado RLS:', rlsStatus);
    }
    
    // 2. Intentar obtener las políticas directamente
    console.log('\n2️⃣  Intentando obtener políticas RLS...');
    
    // Usamos una query SQL directa con supabase-js
    // Nota: esto requiere que tengamos una función RPC o acceso directo
    console.log('⚠️  Necesitamos crear una función RPC para leer políticas');
    console.log('ℹ️  Por ahora, revisaremos el comportamiento con tests');
    
    // 3. Test de permisos con diferentes roles
    console.log('\n3️⃣  Testeando permisos de INSERT...');
    
    // Test con ANON KEY
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const testData = {
      servicio_id: '4fa76cbe-d7a0-4d4b-b3fd-f3bb6bf752b3',
      barbero_id: '0d268607-78fa-49b6-9efe-2ab78735be83',
      fecha: '2025-11-08',
      hora: '14:00',
      cliente_nombre: 'Test RLS',
      cliente_telefono: '+56999999999',
      estado: 'pendiente'
    };
    
    const { data: anonInsert, error: anonError } = await supabaseAnon
      .from('citas')
      .insert([testData])
      .select();
    
    if (anonError) {
      console.log('❌ INSERT con ANON KEY: FALLIDO');
      console.log('   Código:', anonError.code);
      console.log('   Mensaje:', anonError.message);
      
      if (anonError.code === '42501') {
        console.log('\n🔍 DIAGNÓSTICO:');
        console.log('━'.repeat(60));
        console.log('El error 42501 significa: "Insufficient privilege"');
        console.log('Esto indica que:');
        console.log('  • RLS está HABILITADO en la tabla "citas"');
        console.log('  • NO existe una política que permita INSERT para usuarios anónimos');
        console.log('  • O la política existente tiene condiciones que no se cumplen');
        console.log('━'.repeat(60));
        console.log('\n💡 SOLUCIÓN:');
        console.log('Se necesita crear una política RLS que permita INSERT público:');
        console.log('');
        console.log('CREATE POLICY "allow_public_insert_citas"');
        console.log('ON public.citas');
        console.log('FOR INSERT');
        console.log('TO anon, authenticated');
        console.log('WITH CHECK (true);');
        console.log('');
      }
    } else {
      console.log('✅ INSERT con ANON KEY: EXITOSO');
      console.log('   Cita creada:', anonInsert[0].id);
      
      // Limpiar
      await supabase.from('citas').delete().eq('id', anonInsert[0].id);
      console.log('   Cita de prueba eliminada');
    }
    
    // 4. Test de READ con anon key
    console.log('\n4️⃣  Testeando permisos de SELECT...');
    const { data: anonSelect, error: selectError } = await supabaseAnon
      .from('citas')
      .select('id, cliente_nombre')
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT con ANON KEY: FALLIDO');
      console.log('   Error:', selectError.message);
    } else {
      console.log('✅ SELECT con ANON KEY: EXITOSO');
      console.log('   Registros leídos:', anonSelect?.length || 0);
    }
    
    // 5. Verificar qué políticas deberían existir
    console.log('\n5️⃣  Políticas RLS recomendadas para tabla CITAS:');
    console.log('━'.repeat(60));
    console.log('Para un sistema de reservas público, se necesitan:');
    console.log('');
    console.log('📝 INSERT (Crear citas):');
    console.log('   • Permitir a usuarios anónimos crear citas');
    console.log('   • Sin restricciones (WITH CHECK true)');
    console.log('');
    console.log('📖 SELECT (Leer citas):');
    console.log('   • Opción 1: Permitir lectura pública (mostrar disponibilidad)');
    console.log('   • Opción 2: Solo permitir al barbero/admin ver sus citas');
    console.log('');
    console.log('✏️  UPDATE (Actualizar citas):');
    console.log('   • Solo para admin/barberos autenticados');
    console.log('');
    console.log('🗑️  DELETE (Eliminar citas):');
    console.log('   • Solo para admin autenticados');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

checkRLSPolicies().then(() => {
  console.log('\n✅ Verificación completada\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
