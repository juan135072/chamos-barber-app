-- =====================================================
-- 👨‍💈 INSERTAR BARBEROS DE PRUEBA
-- =====================================================
-- Ejecutar este SQL si no hay barberos en la base de datos
-- =====================================================

-- Insertar Carlos Pérez
INSERT INTO public.barberos (
  nombre,
  apellido,
  email,
  telefono,
  instagram,
  descripcion,
  especialidades,
  imagen_url,
  activo,
  slug
) VALUES (
  'Carlos',
  'Pérez',
  'carlos@chamosbarber.com',
  '+56912345678',
  '@carlos_barber',
  'Barbero venezolano con más de 10 años de experiencia. Especialista en cortes clásicos y modernos, fade, degradados y diseños creativos.',
  ARRAY['Cortes Clásicos', 'Fade', 'Degradados', 'Diseños']::TEXT[],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  true,
  'carlos-perez'
) ON CONFLICT (email) DO NOTHING;

-- Insertar Miguel Rodríguez
INSERT INTO public.barberos (
  nombre,
  apellido,
  email,
  telefono,
  instagram,
  descripcion,
  especialidades,
  imagen_url,
  activo,
  slug
) VALUES (
  'Miguel',
  'Rodríguez',
  'miguel@chamosbarber.com',
  '+56987654321',
  '@miguel_barber',
  'Barbero chileno apasionado por las últimas tendencias. Experto en afeitado con navaja, barba y tratamientos faciales.',
  ARRAY['Afeitado con Navaja', 'Barba', 'Tratamientos Faciales', 'Cortes Modernos']::TEXT[],
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
  true,
  'miguel-rodriguez'
) ON CONFLICT (email) DO NOTHING;

-- Insertar Luis González
INSERT INTO public.barberos (
  nombre,
  apellido,
  email,
  telefono,
  instagram,
  descripcion,
  especialidades,
  imagen_url,
  activo,
  slug
) VALUES (
  'Luis',
  'González',
  'luis@chamosbarber.com',
  '+56911223344',
  '@luis_barbershop',
  'Barbero venezolano con técnicas avanzadas de coloración y mechas. Especialista en transformaciones y estilos urbanos.',
  ARRAY['Coloración', 'Mechas', 'Estilos Urbanos', 'Transformaciones']::TEXT[],
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  true,
  'luis-gonzalez'
) ON CONFLICT (email) DO NOTHING;

-- Verificar inserción
SELECT 
  nombre || ' ' || apellido as barbero,
  email,
  array_to_string(especialidades, ', ') as especialidades,
  activo
FROM public.barberos
ORDER BY created_at DESC;
