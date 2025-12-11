#!/usr/bin/env node
/**
 * 🧪 Script para insertar datos de prueba en Supabase
 * 
 * Uso:
 *   node scripts/insertar-datos-prueba.js
 * 
 * Requisitos:
 *   - Variables de entorno configuradas (.env.local)
 *   - Supabase service role key
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno faltantes');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de prueba
const datosCategoriasServicios = [
  { nombre: 'Cortes', descripcion: 'Cortes de cabello profesionales y modernos', orden: 1, activo: true },
  { nombre: 'Barba', descripcion: 'Servicios de arreglo y cuidado de barba', orden: 2, activo: true },
  { nombre: 'Tratamientos', descripcion: 'Tratamientos capilares y faciales', orden: 3, activo: true }
];

const datosServicios = [
  {
    nombre: 'Corte Clásico',
    descripcion: 'Corte tradicional con tijera y máquina, incluye lavado',
    precio: 8000,
    duracion_minutos: 30,
    categoria: 'Cortes',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=400'
  },
  {
    nombre: 'Fade Moderno',
    descripcion: 'Degradado profesional con diseño, incluye lavado y acabado',
    precio: 12000,
    duracion_minutos: 45,
    categoria: 'Cortes',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'
  },
  {
    nombre: 'Arreglo de Barba',
    descripcion: 'Perfilado y arreglo completo de barba con navaja',
    precio: 6000,
    duracion_minutos: 20,
    categoria: 'Barba',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
  },
  {
    nombre: 'Barba Premium',
    descripcion: 'Arreglo completo con toalla caliente, aceites y masaje facial',
    precio: 10000,
    duracion_minutos: 35,
    categoria: 'Barba',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
  },
  {
    nombre: 'Tratamiento Capilar',
    descripcion: 'Hidratación profunda y tratamiento anticaída',
    precio: 15000,
    duracion_minutos: 40,
    categoria: 'Tratamientos',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
  },
  {
    nombre: 'Limpieza Facial',
    descripcion: 'Limpieza profunda de cutis con mascarilla y extracción',
    precio: 18000,
    duracion_minutos: 50,
    categoria: 'Tratamientos',
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400'
  }
];

const datosBarberos = [
  {
    nombre: 'Carlos',
    apellido: 'Pérez',
    email: 'carlos@chamosbarber.com',
    telefono: '+56912345678',
    especialidad: 'Cortes clásicos y modernos',
    anos_experiencia: 8,
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    activo: true,
    descripcion_corta: 'Barbero venezolano con 8 años de experiencia. Especialista en fades y diseños.',
    instagram: '@carlos_barber_chile',
    calificacion_promedio: 4.8
  },
  {
    nombre: 'Miguel',
    apellido: 'Rodríguez',
    email: 'miguel@chamosbarber.com',
    telefono: '+56987654321',
    especialidad: 'Barba y tratamientos faciales',
    anos_experiencia: 3,
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    activo: true,
    descripcion_corta: 'Especialista en cuidado de barba y tratamientos. Atención personalizada.',
    instagram: '@miguel_barbershop',
    calificacion_promedio: 4.5
  }
];

async function insertarDatosPrueba() {
  console.log('🚀 Iniciando inserción de datos de prueba...\n');

  try {
    // 1. Insertar categorías
    console.log('📂 Insertando categorías de servicios...');
    const { data: categorias, error: errorCategorias } = await supabase
      .from('categorias_servicios')
      .upsert(datosCategoriasServicios, { onConflict: 'nombre' })
      .select();

    if (errorCategorias) throw new Error(`Error categorías: ${errorCategorias.message}`);
    console.log(`✅ ${categorias.length} categorías insertadas\n`);

    // 2. Insertar servicios
    console.log('✂️ Insertando servicios...');
    const categoriaMap = {};
    categorias.forEach(cat => {
      categoriaMap[cat.nombre] = cat.id;
    });

    const serviciosConCategoria = datosServicios.map(servicio => ({
      ...servicio,
      categoria_id: categoriaMap[servicio.categoria]
    }));

    // Eliminar campo 'categoria' que no existe en la tabla
    serviciosConCategoria.forEach(s => delete s.cultura);

    const { data: servicios, error: errorServicios } = await supabase
      .from('servicios')
      .upsert(serviciosConCategoria, { onConflict: 'nombre' })
      .select();

    if (errorServicios) throw new Error(`Error servicios: ${errorServicios.message}`);
    console.log(`✅ ${servicios.length} servicios insertados\n`);

    // 3. Insertar barberos
    console.log('💈 Insertando barberos...');
    const { data: barberos, error: errorBarberos } = await supabase
      .from('barberos')
      .upsert(datosBarberos, { onConflict: 'email' })
      .select();

    if (errorBarberos) throw new Error(`Error barberos: ${errorBarberos.message}`);
    console.log(`✅ ${barberos.length} barberos insertados\n`);

    // 4. Insertar horarios para cada barbero (Lun-Sáb 9:00-19:00)
    console.log('🕐 Insertando horarios...');
    const horarios = [];
    barberos.forEach(barbero => {
      for (let dia = 1; dia <= 6; dia++) {
        horarios.push({
          barbero_id: barbero.id,
          dia_semana: dia,
          hora_inicio: '09:00',
          hora_fin: '19:00',
          activo: true
        });
      }
    });

    const { error: errorHorarios } = await supabase
      .from('horarios_barberos')
      .upsert(horarios, { onConflict: 'barbero_id,dia_semana' });

    if (errorHorarios) throw new Error(`Error horarios: ${errorHorarios.message}`);
    console.log(`✅ ${horarios.length} horarios insertados\n`);

    // 5. Insertar citas de ejemplo
    console.log('📅 Insertando citas de ejemplo...');
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);

    const citas = [
      {
        barbero_id: barberos.find(b => b.email === 'carlos@chamosbarber.com')?.id,
        servicio_id: servicios.find(s => s.nombre === 'Fade Moderno')?.id,
        cliente_nombre: 'Juan Pérez',
        cliente_email: 'juan.test@gmail.com',
        cliente_telefono: '+56911111111',
        fecha: fechaManana.toISOString().split('T')[0],
        hora: '10:00',
        estado: 'confirmada',
        notas: 'Cliente regular, prefiere fade bajo'
      },
      {
        barbero_id: barberos.find(b => b.email === 'miguel@chamosbarber.com')?.id,
        servicio_id: servicios.find(s => s.nombre === 'Barba Premium')?.id,
        cliente_nombre: 'Pedro González',
        cliente_email: 'pedro.test@gmail.com',
        cliente_telefono: '+56922222222',
        fecha: fechaPasadoManana.toISOString().split('T')[0],
        hora: '15:00',
        estado: 'pendiente',
        notas: 'Primera vez, consultar por alergias'
      }
    ];

    const { data: citasInsertadas, error: errorCitas } = await supabase
      .from('citas')
      .insert(citas)
      .select();

    if (errorCitas) {
      console.warn(`⚠️ Advertencia citas: ${errorCitas.message}`);
    } else {
      console.log(`✅ ${citasInsertadas.length} citas insertadas\n`);
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN DE DATOS INSERTADOS:');
    console.log('================================');
    console.log(`✅ Categorías: ${categorias.length}`);
    console.log(`✅ Servicios: ${servicios.length}`);
    console.log(`✅ Barberos: ${barberos.length}`);
    console.log(`✅ Horarios: ${horarios.length}`);
    console.log(`✅ Citas: ${citasInsertadas?.length || 0}`);

    console.log('\n🎯 SIGUIENTE PASO: Crear usuarios de prueba');
    console.log('==========================================');
    console.log('\n📧 Usuarios a crear en Supabase Auth:');
    console.log('\n1️⃣ ADMIN:');
    console.log('   Email: admin@chamosbarber.com');
    console.log('   Password: Admin123456!');
    console.log('   → Luego insertar UUID en tabla admin_users\n');
    
    console.log('2️⃣ BARBERO (Carlos):');
    console.log('   Email: carlos@chamosbarber.com');
    console.log('   Password: Carlos123456!\n');
    
    console.log('3️⃣ CLIENTE:');
    console.log('   Email: cliente@test.com');
    console.log('   Password: Cliente123456!\n');

    console.log('✅ ¡Datos de prueba insertados exitosamente!');

  } catch (error) {
    console.error('\n❌ Error durante la inserción:', error.message);
    process.exit(1);
  }
}

// Ejecutar
insertarDatosPrueba();
