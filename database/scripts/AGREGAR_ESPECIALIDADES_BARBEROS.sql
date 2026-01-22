-- Script para agregar especialidades a los barberos existentes
-- Ejecutar en Supabase SQL Editor

-- Carlos Pérez: Especialista en cortes clásicos y barba
UPDATE barberos
SET 
  especialidades = ARRAY['Corte Clásico', 'Barba', 'Afeitado', 'Fade'],
  updated_at = NOW()
WHERE email = 'carlos@chamosbarber.com';

-- Luis González: Especialista en cortes modernos y degradados
UPDATE barberos
SET 
  especialidades = ARRAY['Corte Moderno', 'Degradado', 'Fade', 'Diseño de Cejas'],
  updated_at = NOW()
WHERE email = 'luis@chamosbarber.com';

-- Miguel Rodríguez: Especialista en coloración y tratamientos
UPDATE barberos
SET 
  especialidades = ARRAY['Coloración', 'Tratamiento Capilar', 'Corte Moderno', 'Peinado'],
  updated_at = NOW()
WHERE email = 'miguel@chamosbarber.com';

-- Verificar que se actualizaron correctamente
SELECT 
  nombre,
  apellido,
  email,
  especialidades,
  updated_at
FROM barberos
WHERE email IN (
  'carlos@chamosbarber.com',
  'luis@chamosbarber.com',
  'miguel@chamosbarber.com'
)
ORDER BY nombre;

-- Resultado esperado:
-- | nombre | apellido  | email                   | especialidades                                      | updated_at          |
-- |--------|-----------|-------------------------|-----------------------------------------------------|---------------------|
-- | Carlos | Pérez     | carlos@chamosbarber.com | {Corte Clásico,Barba,Afeitado,Fade}                | 2025-12-15 18:xx:xx |
-- | Luis   | González  | luis@chamosbarber.com   | {Corte Moderno,Degradado,Fade,Diseño de Cejas}     | 2025-12-15 18:xx:xx |
-- | Miguel | Rodríguez | miguel@chamosbarber.com | {Coloración,Tratamiento Capilar,Corte Moderno,...} | 2025-12-15 18:xx:xx |
