#!/usr/bin/env node

/**
 * Script para probar la función createCita y diagnosticar el problema
 * Simula el comportamiento del formulario de reservas
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🧪 TEST: Crear Cita con Anon Key (Simulando Frontend)\n');
console.log('━'.repeat(60));

async function testCrearCita() {
  try {
    // 1. Crear cliente con ANON KEY (como lo hace el frontend)
    console.log('\n1️⃣  Creando cliente Supabase con ANON KEY...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Cliente creado');
    
    // 2. Obtener un barbero disponible
    console.log('\n2️⃣  Obteniendo barberos disponibles...');
    const { data: barberos, error: barberosError } = await supabaseAnon
      .from('barberos')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .limit(1);
    
    if (barberosError) {
      console.error('❌ Error obteniendo barberos:', barberosError);
      throw barberosError;
    }
    
    if (!barberos || barberos.length === 0) {
      console.error('❌ No hay barberos disponibles');
      return;
    }
    
    const barbero = barberos[0];
    console.log(`✅ Barbero seleccionado: ${barbero.nombre} ${barbero.apellido} (${barbero.id})`);
    
    // 3. Obtener un servicio disponible
    console.log('\n3️⃣  Obteniendo servicios disponibles...');
    const { data: servicios, error: serviciosError } = await supabaseAnon
      .from('servicios')
      .select('id, nombre, precio')
      .eq('activo', true)
      .limit(1);
    
    if (serviciosError) {
      console.error('❌ Error obteniendo servicios:', serviciosError);
      throw serviciosError;
    }
    
    if (!servicios || servicios.length === 0) {
      console.error('❌ No hay servicios disponibles');
      return;
    }
    
    const servicio = servicios[0];
    console.log(`✅ Servicio seleccionado: ${servicio.nombre} ($${servicio.precio})`);
    
    // 4. Preparar datos de la cita (fecha futura)
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fecha = mañana.toISOString().split('T')[0];
    const hora = '10:00';
    
    const citaData = {
      servicio_id: servicio.id,
      barbero_id: barbero.id,
      fecha: fecha,
      hora: hora,
      cliente_nombre: 'Test Cliente',
      cliente_telefono: '+56912345678',
      cliente_email: 'test@example.com',
      notas: 'Cita de prueba para diagnóstico',
      estado: 'pendiente'
    };
    
    console.log('\n4️⃣  Datos de la cita a crear:');
    console.log(JSON.stringify(citaData, null, 2));
    
    // 5. Intentar crear la cita con ANON KEY (esto es lo que falla)
    console.log('\n5️⃣  Intentando crear cita con ANON KEY...');
    console.log('⏳ Esperando respuesta de Supabase...');
    
    const { data: citaCreada, error: citaError } = await supabaseAnon
      .from('citas')
      .insert([citaData])
      .select()
      .single();
    
    if (citaError) {
      console.error('\n❌ ERROR AL CREAR CITA CON ANON KEY:');
      console.error('━'.repeat(60));
      console.error('Código:', citaError.code);
      console.error('Mensaje:', citaError.message);
      console.error('Detalles:', citaError.details);
      console.error('Hint:', citaError.hint);
      console.error('━'.repeat(60));
      
      // Si falla con anon key, intentar con service role key
      console.log('\n6️⃣  Intentando crear la MISMA cita con SERVICE ROLE KEY...');
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      
      // Cambiar nombre para evitar duplicados
      citaData.cliente_nombre = 'Test Cliente (Service Role)';
      citaData.hora = '11:00'; // Cambiar hora también
      
      const { data: citaService, error: serviceError } = await supabaseService
        .from('citas')
        .insert([citaData])
        .select()
        .single();
      
      if (serviceError) {
        console.error('❌ ERROR TAMBIÉN CON SERVICE ROLE KEY:', serviceError);
      } else {
        console.log('✅ ¡CITA CREADA EXITOSAMENTE CON SERVICE ROLE KEY!');
        console.log('📊 Datos de la cita:', citaService);
        console.log('\n⚠️  CONCLUSIÓN: El problema es el ANON KEY, no el código');
        
        // Limpiar la cita creada
        await supabaseService.from('citas').delete().eq('id', citaService.id);
        console.log('🗑️  Cita de prueba eliminada');
      }
      
      return;
    }
    
    console.log('\n✅ ¡CITA CREADA EXITOSAMENTE CON ANON KEY!');
    console.log('📊 Datos de la cita:', citaCreada);
    
    // Limpiar la cita de prueba
    await supabaseAnon.from('citas').delete().eq('id', citaCreada.id);
    console.log('🗑️  Cita de prueba eliminada');
    
  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error);
  }
}

// Ejecutar el test
testCrearCita().then(() => {
  console.log('\n━'.repeat(60));
  console.log('✅ Test completado\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
