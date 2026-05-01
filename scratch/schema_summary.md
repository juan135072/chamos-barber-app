# Esquema de la Base de Datos

## Tabla: barberos_resumen
Columnas:
- `id`: string (uuid)  - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) 
- `telefono`: string (character varying) 
- `email`: string (character varying) 
- `color`: string (text) 
- `porcentaje_comision`: number (numeric) 
- `activo`: boolean (boolean) 
- `citas_pendientes`: integer (bigint) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: servicios
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) **[NOT NULL]**
- `descripcion`: string (text) 
- `duracion_minutos`: integer (integer) **[NOT NULL]**
- `precio`: number (numeric) **[NOT NULL]**
- `categoria_id`: string (uuid)  - Note:
This is a Foreign Key to `categorias_servicios.id`.<fk table='categorias_servicios' column='id'/>
- `imagen_url`: string (text) 
- `activo`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `categoria`: string (character varying) 
- `tiempo_buffer`: integer (integer)  - Tiempo en minutos adicional que se bloquea después del servicio para limpieza/preparación.
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: productos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (text) **[NOT NULL]**
- `descripcion`: string (text) 
- `precio_venta`: number (numeric) **[NOT NULL]**
- `precio_costo`: number (numeric) **[NOT NULL]**
- `stock_actual`: integer (integer) **[NOT NULL]**
- `stock_minimo`: integer (integer) **[NOT NULL]**
- `categoria`: string (text) **[NOT NULL]**
- `imagen_url`: string (text) 
- `codigo_barras`: string (text) 
- `activo`: boolean (boolean) **[NOT NULL]**
- `comercio_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: gastos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `descripcion`: string (text) **[NOT NULL]**
- `monto`: number (numeric) **[NOT NULL]**
- `tipo`: string (text) **[NOT NULL]**
- `categoria_id`: string (uuid)  - Note:
This is a Foreign Key to `gastos_categorias.id`.<fk table='gastos_categorias' column='id'/>
- `fecha`: string (date) **[NOT NULL]**
- `registrado_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `created_at`: string (timestamp with time zone) **[NOT NULL]**

## Tabla: liquidaciones
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `numero_liquidacion`: string (character varying) **[NOT NULL]**
- `barbero_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `fecha_inicio`: string (date) **[NOT NULL]**
- `fecha_fin`: string (date) **[NOT NULL]**
- `total_ventas`: number (numeric) **[NOT NULL]**
- `cantidad_servicios`: integer (integer) **[NOT NULL]**
- `porcentaje_comision`: number (numeric) **[NOT NULL]**
- `total_comision`: number (numeric) **[NOT NULL]**
- `facturas_ids`: array (uuid[]) 
- `estado`: string (character varying) 
- `metodo_pago`: string (character varying) 
- `monto_efectivo`: number (numeric) 
- `monto_transferencia`: number (numeric) 
- `referencia_transferencia`: string (character varying) 
- `fecha_pago`: string (timestamp with time zone) 
- `creado_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `pagado_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `notas`: string (text) 
- `motivo_anulacion`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: enlaces_sociales
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `plataforma`: string (character varying) **[NOT NULL]**
- `url`: string (text) **[NOT NULL]**
- `activo`: boolean (boolean) 
- `orden_display`: integer (integer) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: asistencias
Descripción: Registro de asistencia diaria de barberos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `barbero_id`: string (uuid) **[NOT NULL]** - ID del barbero que marcó asistencia

Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `fecha`: string (date) **[NOT NULL]** - Fecha de la asistencia
- `hora`: string (time without time zone) **[NOT NULL]** - Hora exacta en que marcó
- `clave_usada`: string (character varying) **[NOT NULL]**
- `estado`: string (character varying)  - Estado: normal (puntual), tarde, ausente
- `dispositivo`: string (text)  - Información del dispositivo (user agent)
- `ip_address`: string (inet)  - IP desde donde marcó (auditoría)
- `created_at`: string (timestamp with time zone) 
- `latitud_registrada`: number (numeric) 
- `longitud_registrada`: number (numeric) 
- `distancia_metros`: integer (integer) 
- `ubicacion_barberia_id`: string (uuid)  - Note:
This is a Foreign Key to `ubicaciones_barberia.id`.<fk table='ubicaciones_barberia' column='id'/>
- `hora_salida`: string (time without time zone) 
- `salida_registrada`: boolean (boolean) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: horarios_bloqueados
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `barbero_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `fecha_hora_inicio`: string (timestamp with time zone) **[NOT NULL]**
- `fecha_hora_fin`: string (timestamp with time zone) **[NOT NULL]**
- `motivo`: string (text) 
- `created_at`: string (timestamp with time zone) 

## Tabla: caja_sesiones
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `usuario_id`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `fecha_apertura`: string (timestamp with time zone) 
- `fecha_cierre`: string (timestamp with time zone) 
- `monto_inicial`: number (numeric) 
- `monto_final`: number (numeric) 
- `estado`: string (text) 
- `created_at`: string (timestamp with time zone) 

## Tabla: claves_diarias
Descripción: Claves diarias generadas por recepción para marcar asistencia
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `clave`: string (character varying) **[NOT NULL]** - Clave alfanumérica del día (ej: B4R-2201)
- `fecha`: string (date) **[NOT NULL]** - Fecha para la cual es válida la clave
- `activa`: boolean (boolean)  - Si la clave está activa o ha sido deshabilitada
- `creada_por`: string (uuid) 
- `created_at`: string (timestamp with time zone) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: facturas
Descripción: Cache refresh
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `numero_factura`: string (character varying) **[NOT NULL]**
- `tipo_documento`: string (character varying) 
- `cliente_nombre`: string (character varying) **[NOT NULL]**
- `cliente_rut`: string (character varying) 
- `cliente_email`: string (character varying) 
- `cliente_telefono`: string (character varying) 
- `barbero_id`: string (uuid)  - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `cajero_id`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `subtotal`: number (numeric) **[NOT NULL]**
- `descuento`: number (numeric) 
- `total`: number (numeric) **[NOT NULL]**
- `metodo_pago`: string (character varying) **[NOT NULL]**
- `monto_recibido`: number (numeric) 
- `cambio`: number (numeric) 
- `porcentaje_comision`: number (numeric) 
- `comision_barbero`: number (numeric) 
- `ingreso_casa`: number (numeric) 
- `anulada`: boolean (boolean) 
- `motivo_anulacion`: string (text) 
- `anulada_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `fecha_anulacion`: string (timestamp with time zone) 
- `notas`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `created_by`: string (uuid) 
- `items`: undefined (jsonb) 
- `liquidacion_id`: string (uuid)  - Note:
This is a Foreign Key to `liquidaciones.id`.<fk table='liquidaciones' column='id'/>
- `cita_id`: string (uuid)  - Note:
This is a Foreign Key to `citas.id`.<fk table='citas' column='id'/>
- `cierre_caja_id`: string (uuid)  - Note:
This is a Foreign Key to `cierres_caja.id`.<fk table='cierres_caja' column='id'/>
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: facturas_detalle
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `factura_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `facturas.id`.<fk table='facturas' column='id'/>
- `servicio_id`: string (uuid)  - Note:
This is a Foreign Key to `servicios.id`.<fk table='servicios' column='id'/>
- `descripcion`: string (character varying) **[NOT NULL]**
- `cantidad`: integer (integer) 
- `precio_unitario`: number (numeric) **[NOT NULL]**
- `subtotal`: number (numeric) **[NOT NULL]**
- `created_at`: string (timestamp with time zone) 

## Tabla: ubicaciones_barberia
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) **[NOT NULL]**
- `latitud`: number (numeric) **[NOT NULL]**
- `longitud`: number (numeric) **[NOT NULL]**
- `radio_permitido`: integer (integer) 
- `activa`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: solicitudes_barberos
Descripción: Almacena solicitudes de registro de nuevos barberos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (text) **[NOT NULL]**
- `apellido`: string (text) **[NOT NULL]**
- `email`: string (text) **[NOT NULL]**
- `telefono`: string (text) **[NOT NULL]**
- `especialidad`: string (text) **[NOT NULL]**
- `descripcion`: string (text) 
- `experiencia_anos`: integer (integer) **[NOT NULL]**
- `imagen_url`: string (text) 
- `estado`: string (text) **[NOT NULL]** - Estado de la solicitud: pendiente, aprobada, rechazada
- `barbero_id`: string (uuid)  - ID del barbero creado si fue aprobado

Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `revisada_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `fecha_solicitud`: string (timestamp with time zone) **[NOT NULL]**
- `fecha_revision`: string (timestamp with time zone) 
- `notas_revision`: string (text) 
- `created_at`: string (timestamp with time zone) **[NOT NULL]**
- `updated_at`: string (timestamp with time zone) **[NOT NULL]**

## Tabla: admin_users
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `email`: string (character varying) **[NOT NULL]**
- `nombre`: string (character varying) **[NOT NULL]**
- `telefono`: string (character varying) 
- `rol`: string (character varying) **[NOT NULL]**
- `activo`: boolean (boolean) 
- `barbero_id`: string (uuid)  - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: notas_clientes
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `barbero_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `cliente_email`: string (character varying) **[NOT NULL]**
- `cliente_nombre`: string (character varying) **[NOT NULL]**
- `cliente_telefono`: string (character varying) 
- `notas`: string (text) **[NOT NULL]**
- `cita_id`: string (uuid)  - Note:
This is a Foreign Key to `citas.id`.<fk table='citas' column='id'/>
- `tags`: array (text[]) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `imagen_url`: string (text) 

## Tabla: usuarios_con_permisos
Columnas:
- `id`: string (uuid)  - Note:
This is a Primary Key.<pk/>
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `barbero_id`: string (uuid)  - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `email`: string (character varying) 
- `nombre`: string (character varying) 
- `telefono`: string (character varying) 
- `rol`: string (character varying) 
- `activo`: boolean (boolean) 
- `rol_display`: string (text) 
- `permisos`: undefined (jsonb) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: comercios
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (text) **[NOT NULL]**
- `tipo`: string (text) 
- `activo`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `rif`: string (text) 
- `direccion`: string (text) 
- `moneda`: string (text) 

## Tabla: citas
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `barbero_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `servicio_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `servicios.id`.<fk table='servicios' column='id'/>
- `cliente_nombre`: string (character varying) **[NOT NULL]**
- `cliente_email`: string (character varying) 
- `cliente_telefono`: string (character varying) **[NOT NULL]**
- `estado`: string (character varying) 
- `notas`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `fecha`: string (date) **[NOT NULL]**
- `hora`: string (time without time zone) **[NOT NULL]**
- `estado_pago`: string (character varying) 
- `foto_resultado_url`: string (text)  - URL de la foto del resultado final del corte/servicio.
- `notas_tecnicas`: string (text)  - Notas técnicas específicas del corte (ej. #2 a los lados, tijera arriba).
- `items`: undefined (jsonb) 
- `precio_final`: number (numeric) 
- `metodo_pago`: string (character varying) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: gastos_categorias
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (text) **[NOT NULL]**
- `tipo`: string (text) **[NOT NULL]**
- `activo`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) **[NOT NULL]**

## Tabla: configuracion_horarios
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) **[NOT NULL]**
- `hora_entrada_puntual`: string (time without time zone) **[NOT NULL]**
- `hora_salida_minima`: string (time without time zone) 
- `activa`: boolean (boolean) 
- `ubicacion_barberia_id`: string (uuid)  - Note:
This is a Foreign Key to `ubicaciones_barberia.id`.<fk table='ubicaciones_barberia' column='id'/>
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: categorias_servicios
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) **[NOT NULL]**
- `descripcion`: string (text) 
- `orden`: integer (integer) 
- `activo`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 

## Tabla: sesiones_caja
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `comercio_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `usuario_apertura_id`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `usuario_cierre_id`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `fecha_apertura`: string (timestamp with time zone) **[NOT NULL]**
- `fecha_cierre`: string (timestamp with time zone) 
- `monto_inicial`: number (numeric) **[NOT NULL]**
- `monto_final_calculado`: number (numeric) 
- `monto_final_real`: number (numeric) 
- `diferencia`: number (numeric) 
- `estado`: string (text) **[NOT NULL]**
- `notas`: string (text) 
- `created_at`: string (timestamp with time zone) **[NOT NULL]**
- `updated_at`: string (timestamp with time zone) **[NOT NULL]**

## Tabla: solicitudes_barbero
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `user_id`: string (uuid) 
- `nombre`: string (character varying) **[NOT NULL]**
- `apellido`: string (character varying) **[NOT NULL]**
- `email`: string (character varying) **[NOT NULL]**
- `telefono`: string (character varying) **[NOT NULL]**
- `instagram`: string (character varying) 
- `descripcion`: string (text) 
- `especialidades`: array (text[]) 
- `estado`: string (character varying) 
- `revisado_por`: string (uuid)  - Note:
This is a Foreign Key to `admin_users.id`.<fk table='admin_users' column='id'/>
- `notas_revision`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: configuracion_sitio
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre_negocio`: string (character varying) **[NOT NULL]**
- `direccion`: string (text) 
- `telefono`: string (character varying) 
- `email`: string (character varying) 
- `whatsapp`: string (character varying) 
- `instagram`: string (character varying) 
- `facebook`: string (character varying) 
- `twitter`: string (character varying) 
- `youtube`: string (character varying) 
- `tiktok`: string (character varying) 
- `google_maps_url`: string (text) 
- `horario_atencion`: string (text) 
- `descripcion`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: clientes
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `comercio_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `nombre`: string (text) **[NOT NULL]**
- `telefono`: string (text) 
- `email`: string (text) 
- `activo`: boolean (boolean) **[NOT NULL]**
- `created_at`: string (timestamp with time zone) **[NOT NULL]**
- `updated_at`: string (timestamp with time zone) **[NOT NULL]**

## Tabla: sitio_configuracion
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `clave`: string (character varying) **[NOT NULL]**
- `valor`: string (text) 
- `tipo`: string (character varying) 
- `descripcion`: string (text) 
- `categoria`: string (character varying) 
- `publico`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>

## Tabla: walk_in_clients
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (text) **[NOT NULL]**
- `telefono`: string (text) **[NOT NULL]**
- `email`: string (text) 
- `notas`: string (text) 
- `origen`: string (text) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 

## Tabla: inventario_movimientos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `producto_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `productos.id`.<fk table='productos' column='id'/>
- `tipo`: string (text) **[NOT NULL]**
- `cantidad`: integer (integer) **[NOT NULL]**
- `stock_anterior`: integer (integer) **[NOT NULL]**
- `stock_nuevo`: integer (integer) **[NOT NULL]**
- `motivo`: string (text) 
- `referencia_id`: string (text) 
- `created_by`: string (uuid) 
- `comercio_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `created_at`: string (timestamp with time zone) 

## Tabla: barberos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `nombre`: string (character varying) **[NOT NULL]**
- `apellido`: string (character varying) **[NOT NULL]**
- `telefono`: string (character varying) 
- `email`: string (character varying) 
- `instagram`: string (character varying) 
- `descripcion`: string (text) 
- `especialidades`: array (text[]) 
- `imagen_url`: string (text) 
- `activo`: boolean (boolean) 
- `slug`: string (character varying) 
- `created_at`: string (timestamp with time zone) 
- `updated_at`: string (timestamp with time zone) 
- `porcentaje_comision`: number (numeric) **[NOT NULL]** - Porcentaje de comisión que recibe el barbero (ej: 50.00 = 50%)
- `banco`: string (character varying) 
- `tipo_cuenta`: string (character varying) 
- `numero_cuenta`: string (character varying) 
- `titular_cuenta`: string (character varying) 
- `rut`: string (character varying) 
- `rut_titular`: string (character varying) 
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `color`: string (text) 

## Tabla: roles_permisos
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `rol`: string (text) **[NOT NULL]**
- `nombre_display`: string (text) **[NOT NULL]**
- `descripcion`: string (text) 
- `permisos`: undefined (jsonb) **[NOT NULL]**
- `created_at`: string (timestamp with time zone) 

## Tabla: movimientos_caja
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `sesion_id`: string (uuid)  - Note:
This is a Foreign Key to `caja_sesiones.id`.<fk table='caja_sesiones' column='id'/>
- `comercio_id`: string (uuid)  - Note:
This is a Foreign Key to `comercios.id`.<fk table='comercios' column='id'/>
- `tipo`: string (text) **[NOT NULL]**
- `monto`: number (numeric) **[NOT NULL]**
- `descripcion`: string (text) 
- `fecha`: string (timestamp with time zone) 
- `created_at`: string (timestamp with time zone) 

## Tabla: horarios_atencion
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `barbero_id`: string (uuid) **[NOT NULL]** - Note:
This is a Foreign Key to `barberos.id`.<fk table='barberos' column='id'/>
- `dia_semana`: integer (integer) **[NOT NULL]**
- `hora_inicio`: string (time without time zone) **[NOT NULL]**
- `hora_fin`: string (time without time zone) **[NOT NULL]**
- `activo`: boolean (boolean) 
- `created_at`: string (timestamp with time zone) 
- `pausa_inicio`: string (time without time zone) 
- `pausa_fin`: string (time without time zone) 

## Tabla: cierres_caja
Columnas:
- `id`: string (uuid) **[NOT NULL]** - Note:
This is a Primary Key.<pk/>
- `fecha_inicio`: string (date) **[NOT NULL]**
- `fecha_fin`: string (date) **[NOT NULL]**
- `cajero_id`: string (uuid) 
- `monto_apertura`: number (numeric) **[NOT NULL]**
- `monto_esperado_efectivo`: number (numeric) **[NOT NULL]**
- `monto_real_efectivo`: number (numeric) **[NOT NULL]**
- `diferencia`: number (numeric) 
- `total_ventas`: number (numeric) **[NOT NULL]**
- `total_comisiones`: number (numeric) **[NOT NULL]**
- `total_casa`: number (numeric) **[NOT NULL]**
- `metodos_pago`: undefined (jsonb) **[NOT NULL]**
- `notas`: string (text) 
- `estado`: string (text) **[NOT NULL]**
- `created_at`: string (timestamp with time zone) **[NOT NULL]**
- `updated_at`: string (timestamp with time zone) **[NOT NULL]**

