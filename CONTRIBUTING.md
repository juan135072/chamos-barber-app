# Guía de Contribución 🇻🇪💈

Gracias por ser parte del desarrollo de **Chamos Barber**. Para mantener la calidad del proyecto en producción, sigue estos lineamientos.

## 🛠 Proceso de Desarrollo

1. **Ramas**: Crea siempre una rama descriptiva desde `main`.
   - `feat/nombre-funcionalidad`
   - `fix/ticket-o-error`
   - `refactor/mejoras-codigo`
2. **Commits**: Usa mensajes claros y en español (preferiblemente).
3. **Pull Requests**: Antes de fusionar a `main`, asegúrate de que el proyecto compile localmente con `npm run build`.

## 🎨 Estándares de Código

- Usamos **Next.js 14** con el **Pages Router**.
- **TypeScript** es obligatorio para evitar errores en producción.
- Respeta la configuración de `.editorconfig` (2 espacios, LF).
- Mantén los estilos en `Vanilla CSS` o el sistema de estilos previamente definido.

## 🗄 Base de Datos (Supabase)

- Cualquier cambio en el esquema debe estar documentado en `database/scripts/`.
- Asegúrate de probar las políticas de RLS antes de desplegar.

## 🚀 Despliegue

El despliegue es automático a través de **Coolify** al hacer push a la rama `main`. Por favor, verifica dos veces antes de subir cambios a esta rama.

---
*Desarrollado con excelencia por Juan Díaz.*
