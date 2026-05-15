# Guía de Setup - Chamos Barber

## 🚀 Configuración Inicial del Proyecto

Esta guía te llevará paso a paso para configurar el proyecto localmente.

## 📋 Requisitos Previos

### Software Necesario

```bash
# Node.js (versión 18.x o superior)
node --version  # Debe mostrar v18.x.x o superior

# npm (viene con Node.js)
npm --version  # Debe mostrar 9.x.x o superior

# Git
git --version  # Cualquier versión reciente
```

### Instalación de Node.js (si no está instalado)

**macOS/Linux**:
```bash
# Opción 1: usando nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Opción 2: usando package manager
# macOS:
brew install node@18

# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows**:
- Descargar instalador desde [nodejs.org](https://nodejs.org/)
- Ejecutar instalador
- Verificar instalación en CMD: `node --version`

---

## 🔽 1. Clonar el Repositorio

```bash
# Clonar proyecto
git clone https://github.com/tu-usuario/chamos-barber.git

# Entrar al directorio
cd chamos-barber

# Verificar rama actual
git branch
# Debe mostrar: * master
```

---

## 📦 2. Instalar Dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install

# Esto instalará:
# - Next.js 14
# - React 18
# - Supabase clients
# - Tailwind CSS
# - TypeScript
# - Y todas las demás dependencias listadas en package.json
```

**Tiempo estimado**: 2-5 minutos (depende de tu conexión)

**Posibles errores**:

Si ves error de permisos:
```bash
# Limpiar cache de npm
npm cache clean --force

# Intentar de nuevo
npm install
```

Si ves error de versión de Node:
```bash
# Verificar versión
node --version

# Si es menor a 18, actualizar Node.js
```

---

## 🔐 3. Configurar Variables de Entorno

### Crear archivo .env.local

```bash
# En la raíz del proyecto
touch .env.local

# O crear manualmente el archivo
```

### Contenido de .env.local

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.YOUR_ANON_KEY_HERE

# Service Role (solo para operaciones admin en backend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_ROLE_KEY_HERE

# Next.js Configuration
NODE_ENV=development
```

⚠️ **IMPORTANTE**: Solicitar las claves reales al administrador del proyecto

### Verificar que .env.local está ignorado por Git

```bash
# Verificar que .env.local está en .gitignore
cat .gitignore | grep env

# Debe aparecer:
# .env*.local
# .env

# NUNCA commitear .env.local:
git status
# .env.local NO debe aparecer en la lista
```

**📝 Ver guía completa**: [ENV_VARIABLES.md](./ENV_VARIABLES.md)

---

## 🗄️ 4. Configurar Base de Datos (Opcional para Dev)

El proyecto usa Supabase self-hosted. Las tablas ya están creadas en producción.

### Opción A: Usar Base de Datos de Producción

Si tienes acceso a la base de datos de producción:

```env
# En .env.local, usar la URL de producción
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
```

✅ **Ventaja**: No necesitas configurar nada más
⚠️ **Cuidado**: Los cambios afectarán datos reales

### Opción B: Configurar Supabase Local

Si prefieres desarrollo aislado:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar Supabase localmente
supabase init

# Iniciar servicios locales
supabase start

# Esto iniciará:
# - PostgreSQL (puerto 54322)
# - PostgREST API (puerto 54321)
# - Supabase Studio (puerto 54323)
```

Luego actualizar .env.local:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key de Supabase local]
```

### Migrar Esquema de Base de Datos

```bash
# Si usas Supabase local, aplicar migraciones
supabase db push

# O ejecutar scripts SQL manualmente
# Copiar scripts de docs/architecture/DATABASE.md
# Ejecutarlos en Supabase Studio
```

**📝 Ver esquema completo**: [DATABASE.md](../architecture/DATABASE.md)

---

## ▶️ 5. Ejecutar Proyecto en Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor se iniciará en:
# http://localhost:3000
```

**Salida esperada**:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
event - compiled client and server successfully in 2.5s
```

### Verificar que funciona

1. **Abrir navegador**: http://localhost:3000
2. **Deberías ver**: Landing page de Chamos Barber
3. **Probar login**: http://localhost:3000/login

**Credenciales de prueba**:
```
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
```

---

## ✅ 6. Verificar Instalación

### Checklist de Verificación

```bash
# 1. Verificar que el servidor corre
curl http://localhost:3000
# Debe retornar HTML

# 2. Verificar conexión a Supabase
# Abrir navegador → F12 → Console
# No debe haber errores de conexión

# 3. Verificar que Tailwind funciona
# Abrir landing page
# Estilos deben aplicarse correctamente

# 4. Probar login
# Ir a /login
# Usar credenciales de prueba
# Debe redirigir a /admin
```

### Tests (Opcional)

```bash
# Si hay tests configurados
npm test

# Lint (verificar código)
npm run lint
```

---

## 🔧 Configuración del Editor

### Visual Studio Code (Recomendado)

**Extensiones recomendadas**:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode"
  ]
}
```

**Configuración de workspace**:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

---

## 🐛 Troubleshooting de Setup

### Error: "Cannot find module 'next'"

**Causa**: Dependencias no instaladas

**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 already in use"

**Causa**: Otro proceso usando el puerto

**Solución**:
```bash
# Opción 1: Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9

# Opción 2: Usar otro puerto
npm run dev -- -p 3001
```

### Error: "Supabase connection failed"

**Causa**: Variables de entorno incorrectas

**Solución**:
1. Verificar .env.local existe
2. Verificar URLs y keys correctas
3. Reiniciar servidor de desarrollo

### Errores de TypeScript

**Síntoma**: Muchos errores rojos en el editor

**Solución**:
```bash
# Reinstalar types
npm install --save-dev @types/react @types/node

# Reiniciar TypeScript server en VSCode
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## 🚀 Próximos Pasos

Una vez que el proyecto esté corriendo:

1. **Explorar el código**:
   - `src/pages/` - Páginas de la aplicación
   - `src/components/` - Componentes reutilizables
   - `lib/` - Utilidades y tipos

2. **Leer documentación**:
   - [System Overview](../architecture/SYSTEM_OVERVIEW.md)
   - [Database Schema](../architecture/DATABASE.md)
   - [Auth System](../architecture/AUTH_SYSTEM.md)

3. **Empezar a desarrollar**:
   - Crear nueva rama: `git checkout -b feature/mi-feature`
   - Hacer cambios
   - Probar localmente
   - Commit y push

4. **Deployment**:
   - Ver [Deployment Guide](../deployment/COOLIFY_DEPLOY.md)

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Tutoriales

- [Next.js Tutorial](https://nextjs.org/learn)
- [Supabase with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs/installation)

### Comunidad

- [Next.js GitHub](https://github.com/vercel/next.js)
- [Supabase Discord](https://discord.supabase.com)
- [React Community](https://react.dev/community)

---

## 🤝 Contribuir

Ver guía de contribución: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📞 Soporte

Si tienes problemas con el setup:

1. Consultar [Troubleshooting Guide](../deployment/TROUBLESHOOTING.md)
2. Buscar en GitHub Issues
3. Crear nuevo issue con:
   - Descripción del problema
   - Pasos que seguiste
   - Logs de error
   - Tu entorno (OS, Node version, etc.)

---

## 📝 Checklist Final

Antes de empezar a desarrollar, asegúrate de:

- [ ] Node.js 18+ instalado
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] `.env.local` configurado correctamente
- [ ] Servidor de desarrollo corriendo (`npm run dev`)
- [ ] Landing page carga en http://localhost:3000
- [ ] Login funciona con credenciales de prueba
- [ ] Editor configurado (VSCode + extensiones)
- [ ] Git configurado (nombre, email)
- [ ] Documentación leída (al menos System Overview)

✅ **¡Todo listo!** Ahora puedes empezar a desarrollar.
