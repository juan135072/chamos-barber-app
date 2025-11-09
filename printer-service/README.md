# 🖨️ Servicio de Impresión Térmica POS

Servicio Node.js para imprimir facturas automáticamente en impresora térmica POS-8250 (80mm) sin intervención del usuario.

## 📋 Requisitos

- Node.js 16+ instalado
- Impresora térmica POS-8250 conectada por USB
- Drivers de la impresora instalados en el sistema

## 🚀 Instalación

### Windows

1. **Instalar dependencias del sistema:**
   ```bash
   # Instalar herramientas de compilación
   npm install -g windows-build-tools
   ```

2. **Instalar Node.js dependencies:**
   ```bash
   cd printer-service
   npm install
   ```

3. **Conectar impresora:**
   - Conecta la impresora POS-8250 por USB
   - Asegúrate de que Windows la detecte (debería aparecer en "Dispositivos e impresoras")

### Linux/Mac

1. **Instalar dependencias del sistema:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install build-essential libudev-dev

   # Mac
   brew install libusb
   ```

2. **Configurar permisos USB (Linux):**
   ```bash
   # Agregar reglas udev para acceso sin sudo
   sudo nano /etc/udev/rules.d/99-escpos.rules
   
   # Agregar esta línea (ajusta VID:PID según tu impresora):
   SUBSYSTEM=="usb", ATTRS{idVendor}=="XXXX", ATTRS{idProduct}=="XXXX", MODE="0666"
   
   # Recargar reglas
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

3. **Instalar dependencias:**
   ```bash
   cd printer-service
   npm install
   ```

## 🎯 Uso

### 1. Iniciar el servicio

```bash
cd printer-service
npm start
```

Deberías ver:
```
🚀 Servidor de impresión iniciado en puerto 3001
🌐 API disponible en http://localhost:3001
✅ Impresora térmica conectada
```

### 2. Probar impresión

```bash
curl -X POST http://localhost:3001/test
```

Esto debería imprimir una página de prueba.

### 3. Verificar estado

```bash
curl http://localhost:3001/health
```

### 4. Listar impresoras

```bash
curl http://localhost:3001/printers
```

## 🔌 Integración con el POS

El servicio expone un endpoint `/print` que recibe datos de factura y imprime automáticamente:

```javascript
// Desde el frontend (ModalCobrarCita.tsx)
const imprimirDirecto = async (factura) => {
  try {
    const response = await fetch('http://localhost:3001/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ factura })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Impreso exitosamente');
    } else {
      console.error('❌ Error al imprimir:', result.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
};
```

## 🔧 Configuración

### Encontrar VID:PID de tu impresora

**Windows:**
```bash
# Abrir PowerShell como administrador
Get-PnpDevice | Where-Object {$_.FriendlyName -like "*POS*"}
```

**Linux:**
```bash
lsusb
```

**Mac:**
```bash
system_profiler SPUSBDataType
```

Busca algo como:
```
Bus 001 Device 004: ID 0fe6:811e ICS Advent USB Printer
                      ^^^^  ^^^^
                      VID   PID
```

Luego actualiza en `server.js` si es necesario.

## 🐛 Troubleshooting

### "Impresora no disponible"

1. Verifica que esté conectada y encendida
2. Verifica drivers instalados
3. Reinicia el servicio
4. En Linux, verifica permisos USB

### "Error abriendo impresora"

1. Cierra otros programas que puedan estar usando la impresora
2. Desconecta y reconecta la impresora
3. Reinicia el servicio

### "Module not found: usb"

```bash
# Reinstalar dependencias con permisos
npm install --build-from-source
```

## 🚀 Ejecutar como servicio permanente

### Windows (con PM2)

```bash
npm install -g pm2
pm2 start server.js --name "printer-service"
pm2 save
pm2 startup
```

### Linux (systemd)

Crear archivo `/etc/systemd/system/thermal-printer.service`:

```ini
[Unit]
Description=Thermal Printer Service
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/ruta/a/printer-service
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Luego:
```bash
sudo systemctl daemon-reload
sudo systemctl enable thermal-printer
sudo systemctl start thermal-printer
```

## 📚 API Reference

### `GET /health`
Verifica el estado del servicio y la impresora.

**Response:**
```json
{
  "status": "ok",
  "printer": "connected",
  "timestamp": "2025-11-09T22:00:00.000Z"
}
```

### `GET /printers`
Lista impresoras USB disponibles.

**Response:**
```json
{
  "count": 1,
  "devices": [...]
}
```

### `POST /print`
Imprime una factura.

**Body:**
```json
{
  "factura": {
    "numero_factura": "F-20251109-0001",
    "tipo_documento": "boleta",
    "cliente_nombre": "Juan Pérez",
    "cliente_rut": "12345678-9",
    "items": [
      {
        "nombre": "Corte + Barba",
        "cantidad": 1,
        "precio": 15.00,
        "subtotal": 15.00
      }
    ],
    "total": 15.00,
    "metodo_pago": "efectivo",
    "monto_recibido": 20.00,
    "cambio": 5.00,
    "created_at": "2025-11-09T22:00:00.000Z",
    "barbero": {
      "nombre": "Carlos",
      "apellido": "López"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Factura impresa exitosamente",
  "factura": "F-20251109-0001"
}
```

### `POST /test`
Imprime una página de prueba.

**Response:**
```json
{
  "success": true,
  "message": "Prueba impresa"
}
```

## 📝 Notas

- El servicio debe ejecutarse en la misma máquina donde está conectada la impresora
- Puerto por defecto: 3001 (configurable en `server.js`)
- El POS web debe poder acceder a `http://localhost:3001`

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Este servicio está diseñado para uso local. NO lo expongas a internet sin autenticación adecuada.

## 📄 Licencia

MIT
