#!/usr/bin/env node

/**
 * Script para agregar datos demo a la base de datos
 * Puebla las tablas: barbero_portfolio, estadisticas, y más datos de prueba
 */

require('dotenv').config({ path: '.env.local', verbose: true, debug: true });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemoData() {
  console.log('\n🌱 Iniciando seed de datos demo...\n');

  try {
    // 1. Obtener barberos existentes
    const { data: barberos, error: barberosError } = await supabase
      .from('barberos')
      .select('id, nombre, apellido');

    if (barberosError) throw barberosError;
    console.log(`✅ Encontrados ${barberos.length} barberos`);

    // 2. Agregar portafolio para cada barbero
    console.log('\n📸 Agregando imágenes de portafolio...');
    
    const portfolioImages = [
      {
        titulo: 'Corte Fade Clásico',
        descripcion: 'Fade degradado con transición suave y línea definida',
        imagen_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800',
        activo: true,
        orden: 1,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['fade', 'clasico', 'degradado']
      },
      {
        titulo: 'Barba y Bigote',
        descripcion: 'Perfilado profesional con navaja y diseño personalizado',
        imagen_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800',
        activo: true,
        orden: 2,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['barba', 'perfilado', 'navaja']
      },
      {
        titulo: 'Corte Moderno',
        descripcion: 'Estilo contemporáneo con textura y volumen',
        imagen_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
        activo: true,
        orden: 3,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['moderno', 'texturizado', 'volumen']
      },
      {
        titulo: 'Diseño Artístico',
        descripcion: 'Diseños personalizados y líneas precisas',
        imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800',
        activo: true,
        orden: 4,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['diseño', 'artistico', 'lineas']
      },
      {
        titulo: 'Corte Infantil',
        descripcion: 'Atención especializada para los más pequeños',
        imagen_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        activo: true,
        orden: 5,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['infantil', 'niños', 'kids']
      },
      {
        titulo: 'Afeitado Clásico',
        descripcion: 'Afeitado tradicional con toallas calientes',
        imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
        activo: true,
        orden: 6,
        likes: Math.floor(Math.random() * 50) + 10,
        tags: ['afeitado', 'clasico', 'tradicional']
      }
    ];

    let portfolioInserted = 0;
    for (const barbero of barberos) {
      // Agregar 2-3 imágenes aleatorias por barbero
      const numImages = Math.floor(Math.random() * 2) + 2;
      const selectedImages = portfolioImages
        .sort(() => 0.5 - Math.random())
        .slice(0, numImages);

      for (const img of selectedImages) {
        const { error } = await supabase
          .from('barbero_portfolio')
          .insert({
            barbero_id: barbero.id,
            ...img
          });

        if (!error) portfolioInserted++;
      }
    }
    console.log(`✅ ${portfolioInserted} imágenes de portafolio agregadas`);

    // 3. Agregar galerías públicas
    console.log('\n🖼️ Agregando galerías públicas...');
    
    const galerias = [
      {
        nombre: 'Cortes Premium',
        descripcion: 'Nuestra selección de los mejores cortes del mes',
        imagen_url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800',
        activo: true,
        orden: 1,
        categoria: 'cortes',
        destacada: true,
        likes: Math.floor(Math.random() * 100) + 20
      },
      {
        nombre: 'Barbas y Estilos',
        descripcion: 'Arreglos de barba profesionales',
        imagen_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800',
        activo: true,
        orden: 2,
        categoria: 'barbas',
        destacada: true,
        likes: Math.floor(Math.random() * 100) + 20
      },
      {
        nombre: 'Diseños Especiales',
        descripcion: 'Trabajos artísticos y diseños únicos',
        imagen_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
        activo: true,
        orden: 3,
        categoria: 'diseños',
        destacada: false,
        likes: Math.floor(Math.random() * 100) + 20
      },
      {
        nombre: 'Estilo Clásico',
        descripcion: 'Cortes tradicionales con toque moderno',
        imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800',
        activo: true,
        orden: 4,
        categoria: 'clasicos',
        destacada: false,
        likes: Math.floor(Math.random() * 100) + 20
      }
    ];

    const { data: galeriasData, error: galeriasError } = await supabase
      .from('portfolio_galerias')
      .insert(galerias)
      .select();

    if (galeriasError) throw galeriasError;
    console.log(`✅ ${galeriasData.length} galerías agregadas`);

    // 4. Agregar estadísticas mensuales
    console.log('\n📊 Agregando estadísticas...');
    
    const today = new Date();
    const stats = [];
    
    // Generar estadísticas para los últimos 30 días
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      stats.push({
        fecha: date.toISOString().split('T')[0],
        total_citas: Math.floor(Math.random() * 20) + 5,
        total_completadas: Math.floor(Math.random() * 15) + 3,
        total_canceladas: Math.floor(Math.random() * 3),
        total_ingresos: Math.floor(Math.random() * 100000) + 20000,
        barbero_id: null // Estadísticas globales
      });
    }

    const { error: statsError } = await supabase
      .from('estadisticas')
      .insert(stats);

    if (statsError) throw statsError;
    console.log(`✅ ${stats.length} registros de estadísticas agregados`);

    // 5. Agregar más citas de ejemplo
    console.log('\n📅 Agregando citas de ejemplo...');
    
    const { data: servicios } = await supabase
      .from('servicios')
      .select('id')
      .limit(5);

    const citasEjemplo = [];
    const nombres = ['Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez', 'Luis Torres'];
    const estados = ['confirmada', 'pendiente', 'completada'];

    for (let i = 0; i < 10; i++) {
      const fecha = new Date(today);
      fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 14) - 7);
      
      const horas = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
      const hora = horas[Math.floor(Math.random() * horas.length)];

      citasEjemplo.push({
        servicio_id: servicios[Math.floor(Math.random() * servicios.length)].id,
        barbero_id: barberos[Math.floor(Math.random() * barberos.length)].id,
        fecha: fecha.toISOString().split('T')[0],
        hora,
        cliente_nombre: nombres[Math.floor(Math.random() * nombres.length)],
        cliente_telefono: `+569${Math.floor(Math.random() * 90000000) + 10000000}`,
        cliente_email: `cliente${i}@example.com`,
        estado: estados[Math.floor(Math.random() * estados.length)],
        notas: i % 3 === 0 ? 'Cliente prefiere corte más corto' : null
      });
    }

    const { data: citasData, error: citasError } = await supabase
      .from('citas')
      .insert(citasEjemplo)
      .select();

    if (citasError) throw citasError;
    console.log(`✅ ${citasData.length} citas de ejemplo agregadas`);

    // 6. Actualizar configuración del sitio si no existe
    console.log('\n⚙️ Verificando configuración del sitio...');
    
    const configuraciones = [
      { clave: 'sitio_nombre', valor: 'Chamos Barber Shop', tipo: 'texto' },
      { clave: 'sitio_telefono', valor: '+56912345678', tipo: 'texto' },
      { clave: 'sitio_email', valor: 'contacto@chamosbarber.com', tipo: 'texto' },
      { clave: 'sitio_direccion', valor: 'Av. Principal 123, Santiago', tipo: 'texto' },
      { clave: 'google_maps_url', valor: 'https://maps.google.com/?q=Santiago+Chile', tipo: 'url' },
      { clave: 'facebook_url', valor: 'https://facebook.com/chamosbarber', tipo: 'url' },
      { clave: 'instagram_url', valor: 'https://instagram.com/chamosbarber', tipo: 'url' },
      { clave: 'whatsapp_numero', valor: '+56912345678', tipo: 'texto' }
    ];

    let configUpdated = 0;
    for (const config of configuraciones) {
      const { data: existing } = await supabase
        .from('sitio_configuracion')
        .select('id')
        .eq('clave', config.clave)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('sitio_configuracion')
          .insert(config);

        if (!error) configUpdated++;
      }
    }
    
    if (configUpdated > 0) {
      console.log(`✅ ${configUpdated} configuraciones agregadas`);
    } else {
      console.log(`✅ Configuraciones ya existen`);
    }

    console.log('\n✅ ¡Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - ${portfolioInserted} imágenes de portafolio`);
    console.log(`   - ${galeriasData?.length || 0} galerías públicas`);
    console.log(`   - ${stats.length} registros de estadísticas`);
    console.log(`   - ${citasEjemplo.length} citas de ejemplo`);
    console.log(`   - ${configUpdated} configuraciones nuevas\n`);

  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
seedDemoData();
