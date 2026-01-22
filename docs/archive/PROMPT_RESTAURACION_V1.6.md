# 🔄 PROMPT DE RESTAURACIÓN - Estado v1.6.0

**Fecha de Snapshot:** 6 de Noviembre de 2025  
**Versión:** 1.6.0 - Seguridad y UI Completa  
**Commit de Referencia:** `7676e452c97885f92cf83eff7ee43dffb22e30bd`  
**Rama:** `master`

---

## 📋 PROMPT PARA IA

Copia y pega este prompt exacto a tu IA para restaurar el sistema al estado v1.6:

---

```markdown
# CONTEXTO: Restauración de Chamos Barber App v1.6.0

Necesito restaurar mi aplicación **Chamos Barber** al estado funcional v1.6.0.

## Sistema Base
- **Framework:** Next.js con Pages Router
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Lenguaje:** TypeScript
- **Estilos:** CSS custom properties (dark theme)
- **Repositorio:** https://github.com/juan135072/chamos-barber-app.git
- **Rama:** master
- **Commit:** 7676e452c97885f92cf83eff7ee43dffb22e30bd

## Estado Funcional Esperado

### 1. NAVBAR PÚBLICO (src/components/Navbar.tsx)
- ✅ Links públicos: Inicio, Equipo, Reservar, Consultar Cita
- ❌ NO debe tener link "Admin"
- ❌ NO debe verificar roles de usuario
- ✅ Navbar simple y sin lógica de autenticación

**Código esperado:**
```tsx
// Navbar.tsx - v1.6
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

const Navbar = ({ transparent = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  // Solo manejo de scroll, SIN verificación de roles

  return (
    <nav>
      <div className="nav-menu">
        <Link href="/">Inicio</Link>
        <Link href="/equipo">Equipo</Link>
        <Link href="/reservar">Reservar</Link>
        <Link href="/consultar">Consultar Cita</Link>
        {/* NO HAY LINK ADMIN */}
      </div>
    </nav>
  )
}
```

---

### 2. PANEL DE ADMINISTRACIÓN (src/pages/admin.tsx)

**Características:**
- ✅ Validación explícita: `if (rol !== 'admin') → logout + redirect`
- ✅ Header profesional con logo, título, nombre admin, badge "admin"
- ✅ Botón dorado "Cerrar Sesión"
- ✅ 6 tabs: Dashboard, Barberos, Servicios, Horarios, Citas, Solicitudes, Configuración
- ✅ Dark theme completo

**Validación de acceso esperada:**
```tsx
const checkAdminAccess = async () => {
  const adminData = await chamosSupabase.getAdminUser(session.user.email)
  
  // CRÍTICO: Verificación explícita de rol
  if (!adminData || adminData.rol !== 'admin') {
    console.error('[Admin] ❌ ACCESO DENEGADO - Rol:', adminData?.rol)
    await supabase.auth.signOut()
    router.push('/login')
    return
  }
  
  setAdminUser(adminData)
  loadDashboardData()
}
```

---

### 3. PANEL DE BARBERO (src/pages/barbero-panel.tsx)

**CRÍTICO - Estructura SIN Layout:**
```tsx
// barbero-panel.tsx - v1.6
import React from 'react'
import Head from 'next/head'  // NO importar Layout
import { Toaster } from 'react-hot-toast'

const BarberoPanelPage = () => {
  // ... estados y funciones

  return (
    <>
      <Head>
        <title>{`Panel de ${profile.nombre} - Chamos Barber`}</title>
      </Head>
      <Toaster />
      
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header Personalizado */}
        <header style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderBottom: '1px solid var(--border-color)' 
        }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo + Título */}
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full" 
                     style={{ backgroundColor: 'var(--accent-color)' }}>
                  <i className="fas fa-scissors" 
                     style={{ color: 'var(--bg-primary)' }}></i>
                </div>
                <div>
                  <h1 className="text-lg font-semibold" 
                      style={{ color: 'var(--text-primary)' }}>
                    Panel de Barbero
                  </h1>
                  <p className="text-sm" 
                     style={{ color: 'var(--accent-color)' }}>
                    Chamos Barber
                  </p>
                </div>
              </div>

              {/* Nombre + Badge + Botón */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p style={{ color: 'var(--text-primary)' }}>
                    {profile.nombre} {profile.apellido}
                  </p>
                  <p style={{ color: 'var(--accent-color)' }}>barbero</p>
                </div>
                <button
                  onClick={handleLogout}
                  style={{ 
                    backgroundColor: 'var(--accent-color)', 
                    color: 'var(--bg-primary)'
                  }}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <div className="max-w-7xl mx-auto py-6 px-4">
          {/* Tabs y contenido aquí */}
        </div>
      </div>
    </>
  )
}
```

**Validación de acceso esperada:**
```tsx
const loadBarberoData = async () => {
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('barbero_id, rol')
    .eq('id', session?.user?.id)
    .single()

  // CRÍTICO: Solo barberos
  if (adminError || !adminUser || adminUser.rol !== 'barbero') {
    toast.error('No tienes permisos para acceder a este panel')
    router.push('/login')
    return
  }

  // Cargar datos del barbero...
}
```

---

### 4. SISTEMA DE NOTAS DE CLIENTES

**Tabla en Supabase:**
```sql
CREATE TABLE notas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  cliente_email VARCHAR(255) NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(50),
  notas TEXT NOT NULL,
  cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notas_clientes_barbero_id ON notas_clientes(barbero_id);
CREATE INDEX idx_notas_clientes_cliente_email ON notas_clientes(cliente_email);
```

**Componente Modal:**
- Archivo: `src/components/barbero/NotasClienteModal.tsx`
- Props: isOpen, onClose, barberoId, clienteEmail, clienteNombre
- Funciones: Crear, editar, eliminar notas
- Tags predefinidos: 8 opciones (Corte especial, Alergia, etc.)
- Dark theme consistente

**Integración en CitasSection:**
```tsx
// Botón con indicador visual
<button 
  onClick={() => handleOpenNotas(cita)}
  style={{
    background: notasClientes[cita.cliente_email] 
      ? 'rgba(212, 175, 55, 0.2)' 
      : 'var(--bg-primary)',
    color: notasClientes[cita.cliente_email] 
      ? 'var(--accent-color)' 
      : 'var(--text-primary)'
  }}
>
  <i className="fas fa-sticky-note"></i>
  {notasClientes[cita.cliente_email] 
    ? `${notasClientes[cita.cliente_email]} Notas` 
    : 'Agregar Nota'}
</button>
```

---

### 5. DARK THEME EN TABS DE ADMIN

**Tabs con dark theme completo:**
- `SolicitudesTab.tsx`: Stats cards con overlays, filtros oscuros, tabla oscura
- `ServiciosTab.tsx`: Botones de filtro oscuros, cards oscuros
- `CitasTab.tsx`: 5 stats cards con colores, filtros oscuros, tabla oscura

**Variables CSS esperadas:**
```css
--bg-primary: #0F0F0F
--bg-secondary: #1A1A1A
--bg-tertiary: #252525
--accent-color: #D4AF37
--text-primary: #FFFFFF
--border-color: rgba(255, 255, 255, 0.1)
```

---

## PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Barberos ven navbar público en su panel
**Causa:** Panel de barbero usa `<Layout>` component  
**Solución:** Remover `Layout`, usar estructura independiente con `<Head>`

### Problema 2: Botón "Cerrar Sesión" no visible
**Causa:** Layout renderiza Navbar por encima del header  
**Solución:** No usar Layout en barbero-panel.tsx

### Problema 3: Barberos pueden acceder a /admin
**Causa:** Falta validación explícita de `rol === 'admin'`  
**Solución:** En admin.tsx, verificar rol y cerrar sesión si no es admin

### Problema 4: Link "Admin" visible en navbar
**Causa:** Código antiguo con verificación de roles  
**Solución:** Eliminar completamente el link del navbar

---

## CHECKLIST DE VERIFICACIÓN

Después de restaurar, verificar:

**Seguridad:**
- [ ] Navbar NO tiene link "Admin"
- [ ] Barbero NO puede acceder a /admin (sesión cerrada + redirect)
- [ ] Admin puede acceder a /admin directamente por URL
- [ ] Barbero solo ve su panel en /barbero-panel

**UI - Panel de Barbero:**
- [ ] Header personalizado visible (NO navbar público)
- [ ] Icono de tijeras en círculo dorado
- [ ] Título "Panel de Barbero"
- [ ] Nombre del barbero + badge "barbero"
- [ ] Botón "Cerrar Sesión" dorado visible
- [ ] Tabs "Mi Perfil" y "Mis Citas" funcionando

**Sistema de Notas:**
- [ ] Modal de notas se abre correctamente
- [ ] Puede crear notas con tags
- [ ] Contador de notas visible en citas
- [ ] Historial de notas se muestra correctamente

**Dark Theme:**
- [ ] Tabs de admin con dark theme completo
- [ ] Panel de barbero con dark theme
- [ ] Colores consistentes en todo el sistema

---

## ARCHIVOS CRÍTICOS A REVISAR

1. **src/components/Navbar.tsx** - Simple, sin verificación de roles
2. **src/pages/admin.tsx** - Validación explícita `rol === 'admin'`
3. **src/pages/barbero-panel.tsx** - SIN Layout, header propio
4. **src/components/barbero/NotasClienteModal.tsx** - Sistema de notas
5. **src/components/barbero/CitasSection.tsx** - Integración de notas
6. **src/components/admin/tabs/SolicitudesTab.tsx** - Dark theme
7. **src/components/admin/tabs/ServiciosTab.tsx** - Dark theme
8. **src/components/admin/tabs/CitasTab.tsx** - Dark theme

---

## COMANDOS GIT PARA RESTAURAR

```bash
# Clonar repositorio
git clone https://github.com/juan135072/chamos-barber-app.git
cd chamos-barber-app

# Checkout al commit exacto v1.6
git checkout 7676e452c97885f92cf83eff7ee43dffb22e30bd

# O si estás en el repo, resetear a este commit
git reset --hard 7676e452c97885f92cf83eff7ee43dffb22e30bd

# Ver los últimos commits para confirmar
git log --oneline -5
```

Deberías ver:
```
7676e45 fix(barbero-panel): Remover Layout component para mostrar header
e4910da fix(ui): Eliminar link Admin del navbar y mejorar header
328701c debug(security): Agregar logging detallado para diagnóstico
49e427e fix(security): Prevenir acceso de barberos al panel de admin
11f5ff0 feat(notas): Implementar sistema de notas de clientes completo
```

---

## VARIABLES DE ENTORNO NECESARIAS

Asegúrate de tener estas variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

---

## BASE DE DATOS - TABLAS REQUERIDAS

Ejecutar estos scripts SQL en Supabase si faltan:

1. **setup-notas-clientes.sql** - Sistema de notas
2. **fix-rls-citas.sql** - Políticas RLS para citas
3. **setup-storage-barberos-fotos.sql** - Storage para fotos de barberos

---

Por favor, ayúdame a restaurar el sistema siguiendo estas especificaciones exactas.
```

---

## 🎯 ESCENARIOS DE USO DEL PROMPT

### Escenario 1: Sistema Completamente Roto
```
Usuario: "Mi aplicación está rota, necesito volver al estado funcional v1.6"

Acción: Copiar y pegar el PROMPT completo arriba
```

### Escenario 2: Bug de Seguridad - Barberos Acceden a Admin
```
Usuario: "Los barberos pueden entrar al panel de administración"

Acción: Usar sección "Problema 3" del prompt:
- Verificar admin.tsx tiene validación explícita
- Verificar barbero-panel.tsx tiene validación explícita
- Confirmar que Navbar NO tiene link Admin
```

### Escenario 3: Header de Barbero No Visible
```
Usuario: "El panel de barberos muestra el navbar público en vez del header"

Acción: Usar sección "Problema 1 y 2" del prompt:
- Confirmar que barbero-panel.tsx NO usa <Layout>
- Verificar que tiene estructura con <Head> directamente
- Revisar que header está renderizado dentro del return
```

### Escenario 4: Dark Theme Roto
```
Usuario: "Los tabs de admin tienen fondo blanco"

Acción: Usar sección "Dark Theme en Tabs" del prompt:
- Verificar variables CSS están definidas
- Confirmar que tabs usan var(--bg-primary), var(--bg-secondary)
- Revisar que borders usan var(--border-color)
```

### Escenario 5: Sistema de Notas No Funciona
```
Usuario: "No puedo agregar notas a los clientes"

Acción: Usar sección "Sistema de Notas" del prompt:
- Verificar que tabla notas_clientes existe en Supabase
- Confirmar que NotasClienteModal.tsx existe y está importado
- Verificar integración en CitasSection.tsx
```

---

## 📚 DOCUMENTACIÓN RELACIONADA

- **Estado del Sistema:** `DOCUMENTACION_ESTADO_V1.6_SEGURIDAD_COMPLETA.md`
- **Guía de Setup:** `docs/GUIA-RAPIDA-SETUP.md`
- **Sistema de Roles:** `docs/SISTEMA-ROLES-COMPLETO.md`
- **Base de Datos:** `docs/architecture/DATABASE.md`
- **Troubleshooting:** `docs/deployment/TROUBLESHOOTING.md`

---

## ⚠️ NOTAS IMPORTANTES

1. **NO usar Layout en barbero-panel.tsx** - Esto es crítico para que el header sea visible
2. **NO agregar link Admin al Navbar** - La seguridad depende de que solo se acceda por URL directa
3. **Validar roles explícitamente** - Siempre verificar `rol === 'admin'` o `rol === 'barbero'`
4. **Mantener dark theme consistente** - Usar variables CSS en todos los componentes
5. **Sistema de notas requiere tabla en BD** - Ejecutar SQL antes de usar

---

## 🆘 SOPORTE ADICIONAL

Si el prompt no es suficiente, revisar:

1. **Commits en GitHub:** Ver cambios exactos en cada commit
2. **Logs de Coolify:** Verificar que el deploy fue exitoso
3. **Console del navegador:** Buscar errores JavaScript
4. **Network tab:** Verificar que las APIs responden correctamente
5. **Supabase Dashboard:** Confirmar que la estructura de BD está completa

---

**Fecha de Creación:** 6 de Noviembre de 2025  
**Autor:** Sistema de IA - GenSpark  
**Versión del Prompt:** 1.0  
**Estado:** ✅ Validado y probado

