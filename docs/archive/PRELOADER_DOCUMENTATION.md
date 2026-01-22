# 🎬 Preloader Dinámico - Chamos Barber

## ✅ IMPLEMENTACIÓN COMPLETADA (Commit `1b007c7`)

Se agregó un preloader profesional y dinámico con el branding de Chamos Barber en la página principal.

---

## 🎨 CARACTERÍSTICAS DEL PRELOADER:

### **Elementos Visuales:**

1. **✨ Logo Animado**
   - Logo de Chamos Barber con efecto de pulso
   - Glow dorado que pulsa
   - Rotación suave del efecto de color
   - Tamaño: 200px (responsive)

2. **🌟 Texto con Gradiente**
   - "CHAMOS BARBER" con gradiente dorado animado
   - Efecto shimmer (brillo móvil)
   - Subtítulo "Barbería Profesional"
   - Lettering espaciado para efecto premium

3. **📊 Barra de Progreso**
   - Barra animada de 0% a 100%
   - Efecto de brillo que se mueve (shine effect)
   - Color dorado (#D4AF37) acorde al branding
   - Porcentaje numérico en tiempo real

4. **💫 Indicador de Carga**
   - Tres puntos animados que rebotan
   - Animación escalonada (staggered)
   - Color dorado coordinado

5. **🎭 Fondo Dinámico**
   - Degradado negro suave animado
   - Efecto gradient shift
   - Ambiente elegante y profesional

---

## 🚀 ANIMACIONES IMPLEMENTADAS:

| Animación | Elemento | Efecto |
|-----------|----------|--------|
| **pulse** | Logo | Escala 1.0 → 1.05 cada 2s |
| **glowPulse** | Glow del logo | Opacidad y escala pulsante |
| **logoRotate** | Logo filter | Rotación de hue (20s loop) |
| **shimmer** | Texto CHAMOS | Gradiente móvil |
| **progressShine** | Barra progreso | Brillo que se desplaza |
| **dotBounce** | Puntos de carga | Rebote escalonado |
| **fadeInUp** | Container | Entrada suave desde abajo |
| **gradientShift** | Fondo | Movimiento de gradiente |

---

## ⚙️ CONFIGURACIÓN:

### **Archivo:** `src/components/Preloader.tsx`

```typescript
interface PreloaderProps {
  onComplete?: () => void  // Callback al terminar
  duration?: number        // Duración en ms (default: 3000)
}
```

### **Uso en página:**

```typescript
const [showPreloader, setShowPreloader] = useState(true)

// Solo mostrar en primera visita de la sesión
useEffect(() => {
  const hasVisited = sessionStorage.getItem('hasVisitedHome')
  if (hasVisited) {
    setShowPreloader(false)
  } else {
    sessionStorage.setItem('hasVisitedHome', 'true')
  }
}, [])

// Render condicional
if (showPreloader) {
  return <Preloader onComplete={() => setShowPreloader(false)} duration={3000} />
}
```

---

## 🎯 COMPORTAMIENTO:

### **Primera Visita:**
1. Usuario entra a `https://chamosbarber.com`
2. Preloader aparece con animación fadeInUp
3. Progreso aumenta de 0% a 100% en 3 segundos
4. Al llegar a 100%, fade out suave (0.5s)
5. Se muestra el contenido del home
6. Se guarda en `sessionStorage` que ya visitó

### **Visitas Siguientes (misma sesión):**
- NO se muestra el preloader
- Carga directa al home
- Mejor UX para navegación múltiple

### **Nueva Sesión (nueva pestaña/navegador):**
- Preloader se muestra nuevamente
- Reinicia el contador de visitas

---

## 📱 RESPONSIVE:

### **Desktop (>768px):**
- Logo: 200px
- Texto: 2.5rem
- Barra: 300px ancho

### **Tablet (≤768px):**
- Logo: 150px
- Texto: 2rem
- Barra: 250px ancho

### **Mobile (≤480px):**
- Logo: 150px
- Texto: 1.5rem
- Barra: 200px ancho

---

## 🎨 PALETA DE COLORES:

```css
/* Principal */
--gold: #D4AF37;          /* Dorado principal */
--gold-light: #F4E5A0;    /* Dorado claro */
--black: #0a0a0a;         /* Negro profundo */
--gray-dark: #1a1a1a;     /* Gris oscuro */
--gray: #999;             /* Gris texto */

/* Efectos */
--glow: rgba(212, 175, 55, 0.3);      /* Glow dorado */
--shadow: rgba(212, 175, 55, 0.5);    /* Sombra dorada */
```

---

## ⏱️ TIMING:

| Elemento | Duración | Delay |
|----------|----------|-------|
| Preloader total | 3000ms | - |
| FadeInUp | 800ms | 0ms |
| TextFadeIn | 1000ms | 300ms |
| SlideUp (progress) | 1000ms | 600ms |
| Loading dots | 1000ms | 800ms |
| Fade out | 500ms | Al 100% |

---

## 🔧 PERSONALIZACIÓN:

### **Cambiar Duración:**

```typescript
<Preloader duration={5000} /> // 5 segundos
```

### **Cambiar Mensaje:**

En `Preloader.tsx`, línea del tagline:
```typescript
<p className="tagline">Tu mensaje aquí</p>
```

### **Agregar Más Texto:**

```typescript
<div className="text-container">
  <h1 className="brand-name">CHAMOS BARBER</h1>
  <p className="tagline">Barbería Profesional</p>
  <p className="sub-tagline">San Fernando, Chile</p>
</div>
```

### **Cambiar Velocidad de Progreso:**

En `Preloader.tsx`, línea del interval:
```typescript
// Más rápido: incremento más grande
return prev + 5  // 0-100 en menos tiempo

// Más lento: incremento más pequeño
return prev + 1  // 0-100 en más tiempo
```

---

## 🎭 EFECTOS ESPECIALES:

### **1. Logo Glow Pulsante**
```css
.logo-glow {
  background: radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
  animation: glowPulse 2s ease-in-out infinite;
  filter: blur(30px);
}
```

### **2. Gradiente de Texto Animado**
```css
.brand-name {
  background: linear-gradient(135deg, #D4AF37 0%, #F4E5A0 50%, #D4AF37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s ease-in-out infinite;
}
```

### **3. Barra de Progreso con Brillo**
```css
.progress-fill {
  background: linear-gradient(90deg, #D4AF37 0%, #F4E5A0 50%, #D4AF37 100%);
  background-size: 200% 100%;
  animation: progressShine 2s linear infinite;
}
```

---

## 📊 ESTRUCTURA DEL COMPONENTE:

```
Preloader
├── preloader-background (fondo animado)
└── preloader-content
    ├── logo-container
    │   ├── logo-glow (efecto glow)
    │   └── logo-image (logo PNG)
    ├── text-container
    │   ├── brand-name (CHAMOS BARBER)
    │   └── tagline (Barbería Profesional)
    ├── progress-container
    │   ├── progress-bar
    │   │   └── progress-fill (barra animada)
    │   └── progress-text (porcentaje)
    └── loading-message
        └── dots (••• animados)
```

---

## 🚀 DESPLIEGUE:

### **1. Redeploy en Coolify:**
```
https://coolify.app → chamos-barber-app → Redeploy
```

### **2. Probar:**
1. Abre una **ventana de incógnito** (para simular primera visita)
2. Ve a: `https://chamosbarber.com`
3. Deberías ver el preloader durante 3 segundos
4. Después carga el home normalmente

### **3. Probar Navegación:**
1. En la misma sesión, navega a otra página
2. Vuelve al home
3. El preloader NO debería aparecer (mejor UX)

### **4. Nueva Sesión:**
1. Cierra el navegador/pestaña
2. Abre una nueva ventana
3. El preloader aparecerá nuevamente

---

## ✨ MEJORAS FUTURAS (Opcionales):

### **1. Mensajes Aleatorios:**
```typescript
const messages = [
  'Preparando tu experiencia...',
  'Cargando estilos profesionales...',
  'Afilando las navajas...',
  'Bienvenido a Chamos Barber...'
]
```

### **2. Preloader con Sonido:**
```typescript
useEffect(() => {
  const audio = new Audio('/sounds/welcome.mp3')
  audio.play()
}, [])
```

### **3. Detectar Velocidad de Conexión:**
```typescript
// Mostrar solo si la conexión es rápida
if (navigator.connection && navigator.connection.effectiveType === '4g') {
  setShowPreloader(true)
}
```

### **4. Skip Button:**
```typescript
<button onClick={() => setProgress(100)}>
  Saltar →
</button>
```

---

## 📈 PERFORMANCE:

- **Tamaño:** ~9KB (componente)
- **Renderizado:** Instantáneo
- **Animaciones:** GPU-accelerated (transform, opacity)
- **Impacto:** Mínimo (solo se muestra 3s)
- **SEO:** No afecta (pre-render normal)

---

## ✅ CHECKLIST:

```
[✅] Componente Preloader creado
[✅] Integrado en index.tsx
[✅] Animaciones implementadas
[✅] Responsive design
[✅] Session storage para UX
[✅] TypeScript sin errores
[✅] Commit y push completados
[ ] Redeploy en Coolify
[ ] Probar en producción
[ ] Verificar en móvil
```

---

## 🎬 DEMO VISUAL:

```
┌─────────────────────────────────────────┐
│                                         │
│              [GLOW PULSANTE]            │
│                                         │
│          [LOGO ANIMADO 200px]           │
│                                         │
│          CHAMOS BARBER                  │
│       (gradiente dorado shimmer)        │
│                                         │
│       Barbería Profesional              │
│          (gris suave)                   │
│                                         │
│   ────────────────────────────────      │
│   ████████████░░░░░░░░░░░  67%          │
│       (barra con brillo móvil)          │
│                                         │
│              • • •                      │
│         (puntos rebotando)              │
│                                         │
└─────────────────────────────────────────┘

      ↓ (Después de 3 segundos)

┌─────────────────────────────────────────┐
│         [FADE OUT SUAVE]                │
│              ↓                          │
│      [CONTENIDO DEL HOME]               │
└─────────────────────────────────────────┘
```

---

**Última actualización:** 2025-12-15  
**Commit:** `1b007c7`  
**Archivos creados:**
- `src/components/Preloader.tsx`
- Modificado: `src/pages/index.tsx`
