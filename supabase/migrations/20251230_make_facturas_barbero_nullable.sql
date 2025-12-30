-- Migración para permitir borrar barberos sin eliminar facturas
-- Se hace nullable la columna barbero_id en la tabla facturas
ALTER TABLE facturas ALTER COLUMN barbero_id DROP NOT NULL;

-- Asegurar que al borrar un barbero, las citas asociadas pongan su barbero_id a NULL
-- (Aunque el API lo hará manualmente, esto es una red de seguridad)
ALTER TABLE citas 
  DROP CONSTRAINT IF EXISTS citas_barbero_id_fkey,
  ADD CONSTRAINT citas_barbero_id_fkey 
  FOREIGN KEY (barbero_id) 
  REFERENCES barberos(id) 
  ON DELETE SET NULL;
