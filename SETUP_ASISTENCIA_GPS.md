# 🔧 Instrucciones para Configurar el Sistema de Asistencia GPS

## ⚠️ IMPORTANTE: Debes ejecutar los scripts SQL manualmente

Supabase no permite ejecutar SQL arbitrario via API por seguridad. Sigue estos pasos:

## 📋 Paso 1: Acceder al SQL Editor de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto "Chamos Barber"
3. En el menú lateral, click en **"SQL Editor"**
4. Click en el botón **"New Query"**

## 📄 Paso 2: Ejecutar el Script de Geolocalización

1. Abre el archivo: `sql/geolocalizacion_schema.sql`
2. **Copia TODO el contenido** del archivo
3. Pega en el SQL Editor de Supabase
4. Click en **"Run"** o presiona `Ctrl+Enter`
5. Espera a que termine (verás ✅ si fue exitoso)

## 🎯 Paso 3: Insertar Ubicación de Prueba

Ejecuta este SQL en el mismo SQL Editor:

```sql
INSERT INTO ubicaciones_barberia (
    id,
    nombre,
    latitud,
    longitud,
    radio_permitido,
    activa
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Chamos Barber - Principal',
    -33.437916,
    -70.650410,
    100,
    true
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud;
```

## ✅ Verificar que Funcionó

Ejecuta esta query para verificar:

```sql
SELECT * FROM ubicaciones_barberia;
```

Deberías ver la ubicación que acabas de insertar.

## 🌍 Paso 4: Configurar Ubicación Real

1. Ve al **Panel de Administración** de tu app
2. Click en **"Ubicaciones GPS"** en el menú
3. Vísita físicamente la barbería
4. Click en **"📍 Capturar Ubicación Actual"**
5. Asigna un nombre descriptivo (ej: "Chamos Barber - Providencia")
6. Ajusta el radio permitido (recomendado: 50-100 metros)
7. Click en **"Guardar"**

## 🔑 Paso 5: Actualizar el Código

1. Copia el **ID** de la ubicación que acabas de crear
2. Abre: `src/components/barbero/MarcarAsistencia.tsx`
3. Busca la línea ~103 que dice:
   ```typescript
   ubicacion_id: '00000000-0000-0000-0000-000000000001' // TODO: Obtener dinámicamente
   ```
4. Reemplaza el ID con el que copiaste
5. Guarda el archivo

## 🧪 Paso 6: Probar el Sistema

1. Admin genera clave del día (Panel Admin → Asistencia)
2. Barbero intenta marcar asistencia (Panel Barbero → Asistencia)
3. El navegador pedirá permisos de ubicación (click "Permitir")
4. Si está en la barbería → ✅ Asistencia registrada
5. Si está lejos → ❌ Error "Fuera del área permitida"

## 🐛 Troubleshooting

### Error: "relation ubicaciones_barberia does not exist"
- No ejecutaste el script SQL correctamente
- Vuelve al Paso 2 y asegúrate de ejecutar TODO el script

### Error: "No se pudo obtener ubicación"
- El dispositivo no tiene GPS
- No diste permisos de ubicación
- Estás en interiores (mala señal GPS)

### Error: "Fuera del área permitida"
- Aumenta el `radio_permitido` en el panel de admin
- Verifica que las coordenadas GPS sean correctas
- Verifica tu ubicación en https://www.google.com/maps

## 📞 ¿Necesitas Ayuda?

Si tienes problemas, verifica:
1. Que Supabase esté funcionando
2. Que las tablas existan (SQL Editor → ejecuta `\dt`)
3. Que las funciones existan (SQL Editor → ejecuta `\df`)
