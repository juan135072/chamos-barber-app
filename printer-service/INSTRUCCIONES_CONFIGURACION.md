# 🖨️ Documentación: Impresión Directa y Apertura de Caja (v1.1)

Esta guía explica cómo configurar y usar el servicio local para la apertura automática del cajón de dinero e impresión directa.

## 🚀 Nueva Versión: Carpeta Portátil (Sin Node.js)

Para facilitar la instalación, hemos creado una versión que incluye todo lo necesario en un solo lugar.

### Pasos para la Instalación:

1.  **Descargar el servicio**:
    *   Descarga el archivo desde: [https://chamosbarber.com/printer-service.zip](https://chamosbarber.com/printer-service.zip)
    *   Descomprime el archivo `.zip` en una carpeta que no vayas a mover (ej. `C:\Servicios\Printer`).
2.  **Configurar Drivers (CRITICO)**:
    *   Windows detecta las impresoras para su sistema propio, pero para que el cajón abra solo, necesitamos controlarlas directamente.
    *   Abre el programa **Zadig** (incluido o búscalo en Google).
    *   Ve a `Options` -> `List All Devices`.
    *   Busca tu impresora (ej. "USB Printing Support" o el nombre de la marca).
    *   Cambia el driver a **WinUSB** y dale a `Replace Driver`.
    *   **⚠️ NOTA IMPORTANTE**: Al hacer esto, la impresora dejará de aparecer en la lista normal de Windows. Esto es **correcto**. El sistema ahora imprimirá automáticamente a través de nuestro programa con un diseño profesional.
3.  **Iniciar el servicio**:
    *   Haz doble clic en `run.bat`.
    *   Se abrirá una ventana de comandos (negra). **Mantenla abierta** mientras trabajes.
    *   Si ves un mensaje que dice "EN LÍNEA" en el POS, ya está listo.

## 🛠️ Cómo Funciona la Automatización

*   **Apertura Automática**: Al completar un cobro en el POS, el cajón se abrirá solo inmediatamente.
*   **Impresión Directa**: El ticket se imprimirá con el formato oficial de la barbería sin abrir ventanas del navegador.
*   **Apertura Manual**: En el POS hemos añadido un botón con ícono de caja para abrirla sin imprimir si es necesario.

---

## 🆘 Solución de Problemas

### La caja no abre después de configurar Zadig
- Verifica que el cable USB esté bien conectado.
- Cierra el programa `run.bat` y vuelve a abrirlo.
- Asegúrate de haber seleccionado el dispositivo correcto en Zadig.

### Quiero volver a imprimir el PDF desde el navegador
- Si prefieres el método antiguo de PDF del navegador, debes desinstalar el driver WinUSB desde el Administrador de Dispositivos de Windows para que vuelva a ser una impresora de sistema. **Sin embargo, con este método el cajón no abrirá automáticamente.**

---
© 2025 Chamos Barber - Sistema de Automatización
