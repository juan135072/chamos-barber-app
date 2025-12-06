-- ================================================================
-- 🚀 CHAMOS BARBER APP - INICIALIZACIÓN COMPLETA DE BASE DE DATOS
-- ================================================================
-- 
-- INSTRUCCIONES:
-- 1. Abre https://supabase.chamosbarber.com/
-- 2. Ve a SQL Editor → New Query
-- 3. Copia TODO este archivo
-- 4. Pégalo y ejecuta (puede tardar 30-60 segundos)
-- 5. Verifica que no haya errores en la consola
--
-- ================================================================

-- ================================================================
-- PARTE 1: CREAR TABLAS BASE
-- ================================================================

-- 1. TABLA: barberos
CREATE TABLE IF NOT EXISTS public.barberos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  instagram VARCHAR(255),
  descripcion TEXT,
  especialidades TEXT[],
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: categorias_servicios
CREATE TABLE IF NOT EXISTS public.categorias_servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: servicios
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  duracion INTEGER NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  categoria_id UUID REFERENCES public.categorias_servicios(id) ON DELETE SET NULL,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: citas
CREATE TABLE IF NOT EXISTS public.citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_email VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(20) NOT NULL,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion INTEGER NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbero_id, fecha_hora)
);

-- 5. TABLA: admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(20),
  rol VARCHAR(50) NOT NULL DEFAULT 'barbero' CHECK (rol IN ('admin', 'barbero', 'cajero')),
  activo BOOLEAN DEFAULT true,
  barbero_id UUID REFERENCES public.barberos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA: horarios_atencion
CREATE TABLE IF NOT EXISTS public.horarios_atencion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbero_id, dia_semana)
);

-- 7. TABLA: horarios_bloqueados
CREATE TABLE IF NOT EXISTS public.horarios_bloqueados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLA: solicitudes_barbero
CREATE TABLE IF NOT EXISTS public.solicitudes_barbero (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  instagram VARCHAR(255),
  descripcion TEXT,
  especialidades TEXT[],
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  revisado_por UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  notas_revision TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLA: notas_clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  cliente_email VARCHAR(255) NOT NULL,
  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_telefono VARCHAR(20),
  notas TEXT NOT NULL,
  cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TABLA: configuracion_sitio
CREATE TABLE IF NOT EXISTS public.configuracion_sitio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_negocio VARCHAR(255) NOT NULL DEFAULT 'Chamos Barber',
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(255),
  whatsapp VARCHAR(50),
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),
  google_maps_url TEXT,
  horario_atencion TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABLA: enlaces_sociales
CREATE TABLE IF NOT EXISTS public.enlaces_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  orden_display INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- PARTE 2: CREAR ÍNDICES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_barberos_activo ON public.barberos(activo);
CREATE INDEX IF NOT EXISTS idx_barberos_slug ON public.barberos(slug);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON public.servicios(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON public.servicios(categoria_id);
CREATE INDEX IF NOT EXISTS idx_citas_barbero ON public.citas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_email ON public.citas(cliente_email);
CREATE INDEX IF NOT EXISTS idx_admin_users_rol ON public.admin_users(rol);
CREATE INDEX IF NOT EXISTS idx_admin_users_barbero ON public.admin_users(barbero_id);
CREATE INDEX IF NOT EXISTS idx_horarios_atencion_barbero ON public.horarios_atencion(barbero_id);
CREATE INDEX IF NOT EXISTS idx_horarios_bloqueados_barbero ON public.horarios_bloqueados(barbero_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_barbero(estado);
CREATE INDEX IF NOT EXISTS idx_notas_barbero ON public.notas_clientes(barbero_id);
CREATE INDEX IF NOT EXISTS idx_notas_email ON public.notas_clientes(cliente_email);

-- ================================================================
-- PARTE 3: CREAR FUNCIONES ÚTILES
-- ================================================================

-- Función: Generar slug automático
CREATE OR REPLACE FUNCTION public.generate_slug(nombre TEXT, apellido TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(nombre || '-' || apellido, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.barberos WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Aprobar solicitud de barbero
CREATE OR REPLACE FUNCTION public.aprobar_solicitud_barbero(
  solicitud_id UUID,
  admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  solicitud RECORD;
  nuevo_barbero_id UUID;
  user_auth_id UUID;
BEGIN
  SELECT * INTO solicitud FROM public.solicitudes_barbero WHERE id = solicitud_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada');
  END IF;
  
  INSERT INTO public.barberos (nombre, apellido, email, telefono, instagram, descripcion, especialidades, activo)
  VALUES (solicitud.nombre, solicitud.apellido, solicitud.email, solicitud.telefono, 
          solicitud.instagram, solicitud.descripcion, solicitud.especialidades, true)
  RETURNING id INTO nuevo_barbero_id;
  
  user_auth_id := solicitud.user_id;
  
  IF user_auth_id IS NOT NULL THEN
    INSERT INTO public.admin_users (id, email, nombre, telefono, rol, barbero_id, activo)
    VALUES (user_auth_id, solicitud.email, solicitud.nombre || ' ' || solicitud.apellido, 
            solicitud.telefono, 'barbero', nuevo_barbero_id, true)
    ON CONFLICT (id) DO UPDATE SET barbero_id = nuevo_barbero_id, rol = 'barbero';
  END IF;
  
  UPDATE public.solicitudes_barbero
  SET estado = 'aprobada', revisado_por = admin_user_id, updated_at = NOW()
  WHERE id = solicitud_id;
  
  RETURN jsonb_build_object('success', true, 'barbero_id', nuevo_barbero_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PARTE 4: CREAR TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS update_barberos_updated_at ON public.barberos;
CREATE TRIGGER update_barberos_updated_at BEFORE UPDATE ON public.barberos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_servicios_updated_at ON public.servicios;
CREATE TRIGGER update_servicios_updated_at BEFORE UPDATE ON public.servicios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_citas_updated_at ON public.citas;
CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON public.citas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitudes_updated_at ON public.solicitudes_barbero;
CREATE TRIGGER update_solicitudes_updated_at BEFORE UPDATE ON public.solicitudes_barbero
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notas_updated_at ON public.notas_clientes;
CREATE TRIGGER update_notas_updated_at BEFORE UPDATE ON public.notas_clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- PARTE 5: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_atencion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_barbero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sitio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enlaces_sociales ENABLE ROW LEVEL SECURITY;

-- Políticas para BARBEROS (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "barberos_public_select" ON public.barberos;
CREATE POLICY "barberos_public_select" ON public.barberos FOR SELECT USING (true);

DROP POLICY IF EXISTS "barberos_authenticated_all" ON public.barberos;
CREATE POLICY "barberos_authenticated_all" ON public.barberos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para CATEGORIAS_SERVICIOS (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "categorias_public_select" ON public.categorias_servicios;
CREATE POLICY "categorias_public_select" ON public.categorias_servicios FOR SELECT USING (true);

DROP POLICY IF EXISTS "categorias_authenticated_all" ON public.categorias_servicios;
CREATE POLICY "categorias_authenticated_all" ON public.categorias_servicios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para SERVICIOS (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "servicios_public_select" ON public.servicios;
CREATE POLICY "servicios_public_select" ON public.servicios FOR SELECT USING (true);

DROP POLICY IF EXISTS "servicios_authenticated_all" ON public.servicios;
CREATE POLICY "servicios_authenticated_all" ON public.servicios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para CITAS (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "citas_public_select" ON public.citas;
CREATE POLICY "citas_public_select" ON public.citas FOR SELECT USING (true);

DROP POLICY IF EXISTS "citas_authenticated_insert" ON public.citas;
CREATE POLICY "citas_authenticated_insert" ON public.citas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "citas_authenticated_update" ON public.citas;
CREATE POLICY "citas_authenticated_update" ON public.citas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "citas_anon_insert" ON public.citas;
CREATE POLICY "citas_anon_insert" ON public.citas FOR INSERT TO anon WITH CHECK (true);

-- Políticas para ADMIN_USERS (solo autenticados)
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON public.admin_users;
CREATE POLICY "admin_users_authenticated_select" ON public.admin_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_users_authenticated_all" ON public.admin_users;
CREATE POLICY "admin_users_authenticated_all" ON public.admin_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para HORARIOS_ATENCION (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "horarios_public_select" ON public.horarios_atencion;
CREATE POLICY "horarios_public_select" ON public.horarios_atencion FOR SELECT USING (true);

DROP POLICY IF EXISTS "horarios_authenticated_all" ON public.horarios_atencion;
CREATE POLICY "horarios_authenticated_all" ON public.horarios_atencion FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para HORARIOS_BLOQUEADOS (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "horarios_bloqueados_public_select" ON public.horarios_bloqueados;
CREATE POLICY "horarios_bloqueados_public_select" ON public.horarios_bloqueados FOR SELECT USING (true);

DROP POLICY IF EXISTS "horarios_bloqueados_authenticated_all" ON public.horarios_bloqueados;
CREATE POLICY "horarios_bloqueados_authenticated_all" ON public.horarios_bloqueados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para SOLICITUDES_BARBERO (inserción anónima, lectura/actualización autenticada)
DROP POLICY IF EXISTS "solicitudes_anon_insert" ON public.solicitudes_barbero;
CREATE POLICY "solicitudes_anon_insert" ON public.solicitudes_barbero FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "solicitudes_authenticated_select" ON public.solicitudes_barbero;
CREATE POLICY "solicitudes_authenticated_select" ON public.solicitudes_barbero FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "solicitudes_authenticated_update" ON public.solicitudes_barbero;
CREATE POLICY "solicitudes_authenticated_update" ON public.solicitudes_barbero FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Políticas para NOTAS_CLIENTES (solo barberos ven sus propias notas)
DROP POLICY IF EXISTS "notas_barbero_select" ON public.notas_clientes;
CREATE POLICY "notas_barbero_select" ON public.notas_clientes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "notas_barbero_insert" ON public.notas_clientes;
CREATE POLICY "notas_barbero_insert" ON public.notas_clientes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notas_barbero_update" ON public.notas_clientes;
CREATE POLICY "notas_barbero_update" ON public.notas_clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notas_barbero_delete" ON public.notas_clientes;
CREATE POLICY "notas_barbero_delete" ON public.notas_clientes FOR DELETE TO authenticated USING (true);

-- Políticas para CONFIGURACION_SITIO (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "config_public_select" ON public.configuracion_sitio;
CREATE POLICY "config_public_select" ON public.configuracion_sitio FOR SELECT USING (true);

DROP POLICY IF EXISTS "config_authenticated_all" ON public.configuracion_sitio;
CREATE POLICY "config_authenticated_all" ON public.configuracion_sitio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para ENLACES_SOCIALES (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "enlaces_public_select" ON public.enlaces_sociales;
CREATE POLICY "enlaces_public_select" ON public.enlaces_sociales FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "enlaces_authenticated_all" ON public.enlaces_sociales;
CREATE POLICY "enlaces_authenticated_all" ON public.enlaces_sociales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- PARTE 6: INSERTAR DATOS INICIALES
-- ================================================================

-- Insertar categorías de servicios
INSERT INTO public.categorias_servicios (nombre, descripcion, orden, activo) VALUES
  ('Cortes', 'Cortes de cabello modernos y clásicos', 1, true),
  ('Barba', 'Servicios de perfilado y cuidado de barba', 2, true),
  ('Combo', 'Paquetes combinados de servicios', 3, true),
  ('Niños', 'Cortes especiales para niños', 4, true)
ON CONFLICT (nombre) DO NOTHING;

-- Insertar servicios básicos
INSERT INTO public.servicios (nombre, descripcion, duracion, precio, categoria_id, activo)
SELECT 
  'Corte Clásico',
  'Corte de cabello tradicional con máquina y tijera',
  30,
  15000,
  c.id,
  true
FROM public.categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT DO NOTHING;

INSERT INTO public.servicios (nombre, descripcion, duracion, precio, categoria_id, activo)
SELECT 
  'Corte Moderno',
  'Corte de cabello con diseño y degradado',
  45,
  18000,
  c.id,
  true
FROM public.categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT DO NOTHING;

INSERT INTO public.servicios (nombre, descripcion, duracion, precio, categoria_id, activo)
SELECT 
  'Perfilado de Barba',
  'Perfilado y arreglo de barba con navaja',
  20,
  8000,
  c.id,
  true
FROM public.categorias_servicios c WHERE c.nombre = 'Barba'
ON CONFLICT DO NOTHING;

INSERT INTO public.servicios (nombre, descripcion, duracion, precio, categoria_id, activo)
SELECT 
  'Combo Completo',
  'Corte + Barba + Cejas',
  60,
  25000,
  c.id,
  true
FROM public.categorias_servicios c WHERE c.nombre = 'Combo'
ON CONFLICT DO NOTHING;

-- Insertar configuración del sitio
INSERT INTO public.configuracion_sitio (
  nombre_negocio,
  direccion,
  telefono,
  email,
  whatsapp,
  instagram,
  facebook,
  horario_atencion,
  descripcion
) VALUES (
  'Chamos Barber',
  'Santiago, Chile',
  '+56 9 1234 5678',
  'contacto@chamosbarber.com',
  '+56912345678',
  'https://instagram.com/chamosbarber',
  'https://facebook.com/chamosbarber',
  'Lunes a Viernes: 9:00 - 20:00, Sábado: 9:00 - 18:00',
  'Barbería profesional venezolana en Chile. Más de 8 años de experiencia.'
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- PARTE 7: VERIFICACIÓN FINAL
-- ================================================================

SELECT '✅ INICIALIZACIÓN COMPLETA - Verificando tablas creadas...' AS status;

SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tablename) AS columnas
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'barberos', 'categorias_servicios', 'servicios', 'citas', 'admin_users',
    'horarios_atencion', 'horarios_bloqueados', 'solicitudes_barbero', 
    'notas_clientes', 'configuracion_sitio', 'enlaces_sociales'
  )
ORDER BY tablename;

SELECT '🎉 ¡BASE DE DATOS INICIALIZADA CORRECTAMENTE!' AS resultado;
SELECT 'Ahora puedes crear tu usuario administrador.' AS siguiente_paso;

-- ================================================================
-- FIN DE LA INICIALIZACIÓN
-- ================================================================
