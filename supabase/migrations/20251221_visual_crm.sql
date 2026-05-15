-- =============================================
-- 📋 MIGRACIÓN: Ficha Técnica (Visual CRM)
-- Habilita historial con fotos y notas técnicas
-- =============================================

-- 1. Agregar soporte de foto a la cita (para ver el resultado final)
ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS foto_resultado_url TEXT,
ADD COLUMN IF NOT EXISTS notas_tecnicas TEXT;

-- 2. Comentarios para documentación
COMMENT ON COLUMN citas.foto_resultado_url IS 'URL de la foto del resultado final del corte/servicio.';
COMMENT ON COLUMN citas.notas_tecnicas IS 'Notas técnicas específicas del corte (ej. #2 a los lados, tijera arriba).';

-- 3. Crear un bucket en storage para las fotos de cortes (si no existe)
-- Nota: Esto usualmente se hace via Dashboard pero aquí preparamos el SQL para la política
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cortes', 'cortes', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de Storage para 'cortes'
CREATE POLICY "Public Access Cortes" ON storage.objects FOR SELECT USING (bucket_id = 'cortes');
CREATE POLICY "Barberos Upload Cortes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cortes' AND auth.role() = 'authenticated');
