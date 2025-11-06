#!/usr/bin/env node

/**
 * Script para probar la API route /api/crear-cita
 * Simula una petición POST desde el frontend
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://localhost:3000/api/crear-cita';

console.log('\n🧪 TEST: API Route /api/crear-cita\n');
console.log('━'.repeat(60));

async function testAPICrearCita() {
  try {
    // 1. Obtener datos necesarios para la prueba
    console.log('\n1️⃣  Obteniendo barbero y servicio para la prueba...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: barberos } = await supabase
      .from('barberos')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .limit(1);

    const { data: servicios } = await supabase
      .from('servicios')
      .select('id, nombre')
      .eq('activo', true)
      .limit(1);

    if (!barberos || !servicios || barberos.length === 0 || servicios.length === 0) {
      console.error('❌ No hay barberos o servicios disponibles');
      return false;
    }

    const barbero = barberos[0];
    const servicio = servicios[0];

    console.log(`✅ Barbero: ${barbero.nombre} ${barbero.apellido}`);
    console.log(`✅ Servicio: ${servicio.nombre}`);

    // 2. Preparar datos de la cita
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fecha = mañana.toISOString().split('T')[0];

    const citaData = {
      servicio_id: servicio.id,
      barbero_id: barbero.id,
      fecha: fecha,
      hora: '16:00',
      cliente_nombre: 'Test API Route',
      cliente_telefono: '+56988888888',
      cliente_email: 'test-api@example.com',
      notas: 'Cita de prueba para API route',
      estado: 'pendiente'
    };

    console.log('\n2️⃣  Datos de la cita a crear:');
    console.log(JSON.stringify(citaData, null, 2));

    // 3. Hacer petición POST a la API
    console.log('\n3️⃣  Enviando petición POST a API route...');
    console.log(`   URL: ${API_URL}`);

    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(citaData)
    });

    const result = await response.json();

    console.log('\n4️⃣  Respuesta de la API:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body:`, JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ ¡CITA CREADA EXITOSAMENTE A TRAVÉS DE API ROUTE!');
      console.log(`📊 ID de la cita: ${result.data.id}`);

      // Limpiar la cita de prueba
      await supabase.from('citas').delete().eq('id', result.data.id);
      console.log('🗑️  Cita de prueba eliminada');

      return true;
    } else {
      console.log('\n❌ ERROR AL CREAR CITA A TRAVÉS DE API ROUTE');
      console.log(`   Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ ERROR: No se puede conectar al servidor');
      console.error('   El servidor Next.js no está ejecutándose');
      console.error('\n💡 SOLUCIÓN:');
      console.error('   1. Inicia el servidor: npm run dev');
      console.error('   2. Espera a que esté listo');
      console.error('   3. Vuelve a ejecutar este script');
    } else {
      console.error('\n❌ ERROR:', error.message);
    }
    return false;
  }
}

testAPICrearCita().then((success) => {
  if (success) {
    console.log('\n✅ ¡PROBLEMA DE RESERVAS RESUELTO!');
    console.log('\n📝 La API route funciona correctamente');
    console.log('   Frontend puede crear citas usando /api/crear-cita\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Revisar logs para más detalles\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
