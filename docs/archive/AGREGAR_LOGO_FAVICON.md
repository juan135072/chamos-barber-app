# 🎨 Integración del Logo Chamos Barber Shop

## 📋 **Archivos Actualizados**

### **1. Logo descargado**
- ✅ `/public/chamos-logo.png` (47.28 KB)

### **2. Favicon (Pendiente de generar)**

Para crear el favicon, tienes dos opciones:

#### **Opción A: Usar herramienta online (RECOMENDADO)**
1. Ve a: https://favicon.io/favicon-converter/
2. Sube: `/public/chamos-logo.png`
3. Descarga el paquete generado
4. Coloca los archivos en `/public/`:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`

#### **Opción B: Usar ImageMagick (en servidor)**
```bash
cd /home/user/webapp/public
convert chamos-logo.png -resize 32x32 favicon-32x32.png
convert chamos-logo.png -resize 16x16 favicon-16x16.png
convert chamos-logo.png -resize 180x180 apple-touch-icon.png
convert chamos-logo.png -resize 32x32 favicon.ico
```

---

## 🔧 **Lugares donde agregar el logo**

### **1. Panel de Administración**
- Header principal
- Página de login
- Sidebar (versión compacta)

### **2. Panel de Barbero**
- Header principal
- Página de login

### **3. Sitio Web Público**
- Navbar
- Footer
- Hero section

### **4. Factura/Recibo (POS)**
- Encabezado de factura impresa

### **5. PDF de Liquidaciones** (cuando se implemente)
- Encabezado del PDF

---

## 📝 **Cambios recomendados en componentes**

Los componentes que necesitan actualización:
- `src/components/Navbar.tsx` (si existe)
- `src/pages/login.tsx` (admin/barbero)
- `src/components/admin/AdminHeader.tsx` (si existe)
- Cualquier header/sidebar del panel

---

## 🎨 **Estilos recomendados para el logo**

```css
/* Logo en navbar/header */
.logo {
  height: 48px;
  width: auto;
}

/* Logo compacto en sidebar */
.logo-compact {
  height: 32px;
  width: auto;
}

/* Logo en login */
.logo-login {
  height: 120px;
  width: auto;
  margin-bottom: 2rem;
}

/* Logo en factura */
.logo-print {
  height: 60px;
  width: auto;
}
```

---

## ✅ **Siguiente paso**

¿Quieres que actualice automáticamente los componentes del panel de administración y páginas de login para incluir el logo?
