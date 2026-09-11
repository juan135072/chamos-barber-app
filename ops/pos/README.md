# Verificación del POS

Las migraciones `20260911_pos_rpc_permissions.sql` y `20260911_pos_register_transactions.sql` deben aplicarse antes de publicar el POS actualizado.

`npm test` comprueba validaciones, importes, fechas de Chile, formularios y generación de comprobantes. `npm run typecheck` y `npm run lint` validan la aplicación.

`verify-isolated.py` reproduce operaciones HTTP contra una aplicación e InsForge separados en el VPS. Requiere la copia `chamos_pos_verify_20260911`, los contenedores `chamos-pos-forge-test` y `chamos-pos-rest-test`, la imagen candidata `chamos-pos-candidate:20260911` y el código en `/root/chamos-pos-20260911/source`. Verifica que la base de prueba difiera de producción antes de preparar datos. Usa credenciales solamente desde el entorno del servidor; no contiene contraseñas.

La prueba crea ventas y modifica datos exclusivamente en esa copia. No debe apuntarse la aplicación candidata al backend de producción. El navegador de una imagen compilada con las direcciones públicas de producción tampoco debe utilizarse para escribir en el entorno de prueba. La prueba HTTP mantiene todas sus consultas dentro del backend aislado.

Antes de cambiar producción, guardar un respaldo y verificar la imagen candidata. Las funciones de escritura del POS se invocan solo desde rutas que comprueban sesión, rol y comercio; visitantes y usuarios autenticados no pueden ejecutarlas directamente.
