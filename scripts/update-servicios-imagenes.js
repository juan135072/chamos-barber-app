const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Imágenes de ejemplo de alta calidad para cada servicio
const imagenesServicios = {
  // Cortes
  'Corte Clásico': 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop',
  'Corte Moderno': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
  'Corte Premium': 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop',
  'Corte Niños': 'https://images.unsplash.com/photo-1503516459261-40c66117780a?w=400&h=400&fit=crop',
  'Corte Adulto Mayor': 'https://images.unsplash.com/photo-1599351431202-1e0f0161562a?w=400&h=400&fit=crop',
  
  // Barbas
  'Arreglo de Barba': 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&h=400&fit=crop',
  'Barba + Bigote': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
  'Afeitado Tradicional': 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop',
  
  // Combos
  'Corte + Barba': 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
  'Servicio Completo': 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?w=400&h=400&fit=crop',
  
  // Tratamientos
  'Tratamiento Capilar': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop',
  'Coloración/Mechas': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
  'Cejas Masculinas': 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop',
  
  // Diseños
  'Diseño Personalizado': 'https://images.unsplash.com/photo-1599351431202-1e0f0161562a?w=400&h=400&fit=crop',
  
  // Especiales
  'Servicio a Domicilio': 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop'
};

async function updateServiciosImages() {
  console.log('🎨 Actualizando imágenes de servicios...\n');
  
  try {
    // Obtener todos los servicios
    const { data: servicios, error: fetchError } = await supabase
      .from('servicios')
      .select('id, nombre, categoria');
    
    if (fetchError) {
      console.error('❌ Error obteniendo servicios:', fetchError);
      return;
    }
    
    console.log(`📋 Total de servicios: ${servicios.length}\n`);
    
    let actualizados = 0;
    let sinImagen = 0;
    
    // Actualizar cada servicio
    for (const servicio of servicios) {
      const imagenUrl = imagenesServicios[servicio.nombre];
      
      if (imagenUrl) {
        const { error: updateError } = await supabase
          .from('servicios')
          .update({ imagen_url: imagenUrl })
          .eq('id', servicio.id);
        
        if (updateError) {
          console.error(`❌ Error actualizando "${servicio.nombre}":`, updateError.message);
        } else {
          console.log(`✅ "${servicio.nombre}" - Imagen asignada`);
          actualizados++;
        }
      } else {
        console.log(`⚠️  "${servicio.nombre}" - Sin imagen definida`);
        sinImagen++;
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Actualizados: ${actualizados}`);
    console.log(`   ⚠️  Sin imagen: ${sinImagen}`);
    console.log(`   📋 Total: ${servicios.length}`);
    console.log(`\n🎉 ¡Proceso completado!`);
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

// Ejecutar
updateServiciosImages();
