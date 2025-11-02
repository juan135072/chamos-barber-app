-- ===================================================================
-- CREAR TABLA: solicitudes_barberos
-- ===================================================================
-- Sistema de registro y aprobación de nuevos barberos
-- Los barberos se registran y el admin los aprueba/rechaza
-- ===================================================================

-- 1. Crear tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes_barberos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información personal del solicitante
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(20) NOT NULL,
  
  -- Información profesional
  anos_experiencia INTEGER NOT NULL CHECK (anos_experiencia >= 0),
  especialidades TEXT, -- Separadas por comas
  biografia TEXT,
  
  -- Foto/Portfolio (URLs)
  foto_perfil_url TEXT,
  portfolio_urls TEXT, -- URLs separadas por comas
  
  -- Estado de la solicitud
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  
  -- Motivo de rechazo (si aplica)
  motivo_rechazo TEXT,
  
  -- Admin que revisó la solicitud
  revisada_por UUID REFERENCES admin_users(id),
  fecha_revision TIMESTAMP WITH TIME ZONE,
  
  -- Barbero creado (si fue aprobada)
  barbero_id UUID REFERENCES barberos(id),
  
  -- Notas internas del admin
  notas_admin TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_solicitudes_email ON solicitudes_barberos(email);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_barberos(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON solicitudes_barberos(created_at DESC);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_solicitudes_barberos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_solicitudes_barberos_updated_at ON solicitudes_barberos;
CREATE TRIGGER trigger_update_solicitudes_barberos_updated_at
  BEFORE UPDATE ON solicitudes_barberos
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitudes_barberos_updated_at();

-- ===================================================================
-- POLÍTICAS RLS
-- ===================================================================

-- 4. Habilitar RLS
ALTER TABLE solicitudes_barberos ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICA 1: Usuarios anónimos pueden INSERT (registrarse)
CREATE POLICY "anon_insert_solicitudes"
ON solicitudes_barberos
FOR INSERT
TO anon
WITH CHECK (true);

-- 6. POLÍTICA 2: Usuarios autenticados pueden SELECT (admins ven todas)
CREATE POLICY "authenticated_select_solicitudes"
ON solicitudes_barberos
FOR SELECT
TO authenticated
USING (true);

-- 7. POLÍTICA 3: Usuarios autenticados pueden UPDATE (admins aprueban/rechazan)
CREATE POLICY "authenticated_update_solicitudes"
ON solicitudes_barberos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. POLÍTICA 4: Service role acceso completo
CREATE POLICY "service_role_all_solicitudes"
ON solicitudes_barberos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===================================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ===================================================================

-- Insertar una solicitud de prueba
INSERT INTO solicitudes_barberos (
  nombre,
  apellido,
  email,
  telefono,
  anos_experiencia,
  especialidades,
  biografia,
  estado
) VALUES (
  'Andrés',
  'González',
  'andres.gonzalez@example.com',
  '+58 424 555 1234',
  5,
  'Cortes modernos, Fades, Diseños',
  'Barbero venezolano con 5 años de experiencia. Especializado en cortes modernos y fades. Apasionado por crear estilos únicos para cada cliente.',
  'pendiente'
);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================

-- Ver políticas RLS
SELECT 
  policyname,
  cmd,
  roles::text
FROM pg_policies 
WHERE tablename = 'solicitudes_barberos'
ORDER BY cmd, policyname;

-- Ver solicitudes existentes
SELECT 
  id,
  nombre,
  apellido,
  email,
  anos_experiencia,
  estado,
  created_at
FROM solicitudes_barberos
ORDER BY created_at DESC;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- 
-- ✅ Tabla 'solicitudes_barberos' creada
-- ✅ 4 políticas RLS activas
-- ✅ Índices para performance
-- ✅ Trigger de updated_at
-- ✅ 1 solicitud de prueba insertada
-- ✅ Sistema listo para recibir registros de barberos
--
-- ===================================================================
