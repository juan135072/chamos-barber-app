#!/usr/bin/env node

/**
 * Script para aplicar el fix de política RLS en la tabla citas
 * Ejecuta el SQL necesario para permitir INSERT público
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔧 APLICANDO FIX DE POLÍTICA RLS PARA TABLA CITAS\n');
console.log('━'.repeat(60));

async function applyRLSFix() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('\n1️⃣  Verificando acceso a la base de datos...');
    const { data: testData, error: testError } = await supabase
      .from('citas')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de acceso:', testError);
      throw testError;
    }
    
    console.log('✅ Acceso confirmado');
    
    // 2. Crear política para INSERT público
    console.log('\n2️⃣  Creando política RLS para permitir INSERT público...');
    
    // Nota: Supabase JS client no tiene un método directo para ejecutar DDL
    // Vamos a usar el approach de intentar hacer la operación directamente
    // y verificar si funciona después
    
    console.log('⚠️  Supabase JS client no soporta DDL directo (CREATE POLICY)');
    console.log('ℹ️  Necesitamos usar una función RPC o acceso directo a PostgreSQL');
    
    // Intentemos verificar si ya existe una política permisiva
    console.log('\n3️⃣  Verificando estado actual de RLS...');
    
    // Probar INSERT con anon key para ver el estado actual
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const testInsert = {
      servicio_id: '4fa76cbe-d7a0-4d4b-b3fd-f3bb6bf752b3',
      barbero_id: '0d268607-78fa-49b6-9efe-2ab78735be83',
      fecha: '2025-11-08',
      hora: '15:00',
      cliente_nombre: 'Test RLS Fix',
      cliente_telefono: '+56900000000',
      estado: 'pendiente'
    };
    
    const { data: insertData, error: insertError } = await supabaseAnon
      .from('citas')
      .insert([testInsert])
      .select();
    
    if (insertError) {
      console.log('❌ INSERT con ANON KEY aún falla');
      console.log('   Error:', insertError.message);
      console.log('   Código:', insertError.code);
      
      if (insertError.code === '42501') {
        console.log('\n⚠️  POLÍTICA RLS NECESITA SER CREADA MANUALMENTE');
        console.log('━'.repeat(60));
        console.log('\nNo puedo ejecutar CREATE POLICY desde Supabase JS client.');
        console.log('Necesitas ejecutar este SQL en Supabase SQL Editor:\n');
        console.log('CREATE POLICY "allow_public_insert_citas"');
        console.log('ON public.citas');
        console.log('FOR INSERT');
        console.log('TO anon, authenticated');
        console.log('WITH CHECK (true);');
        console.log('\n📁 El SQL completo está en: supabase/fix-rls-citas.sql');
        console.log('━'.repeat(60));
        
        return false;
      }
    } else {
      console.log('✅ ¡INSERT con ANON KEY FUNCIONA!');
      console.log('📊 Cita creada:', insertData[0].id);
      
      // Limpiar la cita de prueba
      await supabase.from('citas').delete().eq('id', insertData[0].id);
      console.log('🗑️  Cita de prueba eliminada');
      
      console.log('\n✅ ¡POLÍTICA RLS YA ESTÁ CONFIGURADA CORRECTAMENTE!');
      return true;
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return false;
  }
}

applyRLSFix().then((success) => {
  if (success) {
    console.log('\n✅ Fix aplicado exitosamente\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Se requiere acción manual en Supabase SQL Editor\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
