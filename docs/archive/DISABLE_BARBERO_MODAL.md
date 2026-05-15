# 🚨 BARBERO MODAL - DESHABILITADO TEMPORALMENTE

## Problema
El componente `BarberoModal.tsx` usa campos que no existen en la base de datos:
- `especialidad` (debería ser `especialidades` array)
- `experiencia_anos` (no existe)
- `calificacion` (no existe)
- `precio_base` (no existe)
- `orden_display` (no existe)

## Solución Temporal
Deshabilitar el modal de creación/edición de barberos en el admin panel hasta que se pueda refactorizar completamente.

## Solución Permanente (Pendiente)
Crear un nuevo BarberoModal que use solo los campos reales:
- nombre
- apellido
- email
- telefono
- especialidades (array)
- descripcion
- instagram
- imagen_url
- slug
- porcentaje_comision
- activo
