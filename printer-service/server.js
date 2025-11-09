const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la impresora
let device;
let printer;

// Intentar conectar con la impresora al iniciar
function initPrinter() {
  try {
    // Buscar impresora USB
    // VID y PID de tu impresora POS-8250 (puedes necesitar ajustarlos)
    const devices = escpos.USB.findPrinter();
    
    if (devices && devices.length > 0) {
      device = new escpos.USB();
      printer = new escpos.Printer(device);
      console.log('✅ Impresora térmica conectada');
      console.log('Dispositivos encontrados:', devices.length);
      return true;
    } else {
      console.warn('⚠️ No se encontró impresora USB');
      return false;
    }
  } catch (error) {
    console.error('❌ Error conectando impresora:', error.message);
    return false;
  }
}

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    printer: printer ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para listar impresoras disponibles
app.get('/printers', (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.json({
      count: devices ? devices.length : 0,
      devices: devices || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para imprimir factura
app.post('/print', async (req, res) => {
  try {
    const { factura } = req.body;

    if (!factura) {
      return res.status(400).json({ error: 'Datos de factura requeridos' });
    }

    // Reconectar si es necesario
    if (!printer) {
      const connected = initPrinter();
      if (!connected) {
        return res.status(503).json({ 
          error: 'Impresora no disponible',
          message: 'Verifica que la impresora esté conectada y encendida'
        });
      }
    }

    // Abrir conexión
    device.open(function(error) {
      if (error) {
        console.error('Error abriendo dispositivo:', error);
        return res.status(500).json({ error: 'Error abriendo impresora' });
      }

      try {
        // Configurar formato
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text('CHAMOS BARBERÍA')
          .style('normal')
          .size(0, 0)
          .text('Barbería Profesional')
          .text('')
          .text('RIF: J-12345678-9')
          .text('Telf: +58 412-XXX-XXXX')
          .text('Valencia, Carabobo')
          .text('')
          .drawLine()
          .text('')
          
          // Tipo de documento
          .style('bu')
          .size(1, 1)
          .text(factura.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA')
          .style('normal')
          .size(0, 0)
          .text(`No. ${factura.numero_factura}`)
          .text('')
          
          // Fecha y hora
          .align('lt')
          .text(`Fecha: ${new Date(factura.created_at).toLocaleDateString('es-VE')}`)
          .text(`Hora: ${new Date(factura.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`)
          .text('')
          .drawLine()
          .text('')
          
          // Cliente
          .style('b')
          .text('CLIENTE')
          .style('normal')
          .text(factura.cliente_nombre);

        // RUT si es factura
        if (factura.cliente_rut) {
          printer.text(`RUT: ${factura.cliente_rut}`);
        }

        // Barbero
        if (factura.barbero) {
          printer
            .text('')
            .text(`Atendido por: ${factura.barbero.nombre} ${factura.barbero.apellido}`);
        }

        printer
          .text('')
          .drawLine()
          .text('')
          
          // Servicios
          .style('b')
          .text('SERVICIOS')
          .style('normal')
          .text('');

        // Items
        factura.items.forEach(item => {
          printer
            .style('b')
            .text(item.nombre)
            .style('normal')
            .text(`  ${item.cantidad} x $${item.precio.toFixed(2)} = $${item.subtotal.toFixed(2)}`)
            .text('');
        });

        printer
          .drawLine()
          .text('')
          
          // Total
          .style('bu')
          .size(1, 1)
          .align('rt')
          .text(`TOTAL: $${factura.total.toFixed(2)}`)
          .style('normal')
          .size(0, 0)
          .align('lt')
          .text('')
          
          // Método de pago
          .text('Método de pago:');

        const metodoPagoLabels = {
          efectivo: 'Efectivo',
          tarjeta: 'Tarjeta Debito/Credito',
          transferencia: 'Transferencia Bancaria',
          zelle: 'Zelle',
          binance: 'Binance Pay'
        };

        printer
          .style('b')
          .text(metodoPagoLabels[factura.metodo_pago] || factura.metodo_pago)
          .style('normal');

        // Monto recibido y cambio
        if (factura.metodo_pago === 'efectivo' && factura.monto_recibido) {
          printer
            .text('')
            .text(`Recibido: $${factura.monto_recibido.toFixed(2)}`);
          
          if (factura.cambio && factura.cambio > 0) {
            printer.text(`Cambio: $${factura.cambio.toFixed(2)}`);
          }
        }

        printer
          .text('')
          .drawLine()
          .text('')
          
          // Footer
          .align('ct')
          .style('b')
          .text('¡Gracias por su preferencia!')
          .style('normal')
          .text('Esperamos volver a verlo pronto')
          .text('')
          .text('Síguenos en redes sociales:')
          .style('b')
          .text('@chamosbarber')
          .style('normal')
          .text('')
          .text('')
          .text('')
          
          // Cortar papel
          .cut()
          
          // Cerrar
          .close(() => {
            console.log('✅ Impresión completada');
            res.json({ 
              success: true, 
              message: 'Factura impresa exitosamente',
              factura: factura.numero_factura
            });
          });

      } catch (printError) {
        console.error('Error durante impresión:', printError);
        res.status(500).json({ error: 'Error durante impresión', details: printError.message });
      }
    });

  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para test de impresión
app.post('/test', (req, res) => {
  try {
    if (!printer) {
      const connected = initPrinter();
      if (!connected) {
        return res.status(503).json({ error: 'Impresora no disponible' });
      }
    }

    device.open(function(error) {
      if (error) {
        return res.status(500).json({ error: 'Error abriendo impresora' });
      }

      printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text('PRUEBA DE IMPRESIÓN')
        .style('normal')
        .size(0, 0)
        .text('')
        .text('Si puedes leer esto,')
        .text('la impresora funciona correctamente')
        .text('')
        .text(new Date().toLocaleString('es-VE'))
        .text('')
        .text('')
        .cut()
        .close(() => {
          res.json({ success: true, message: 'Prueba impresa' });
        });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de impresión iniciado en puerto ${PORT}`);
  console.log(`🌐 API disponible en http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints disponibles:');
  console.log(`  GET  /health    - Estado del servicio`);
  console.log(`  GET  /printers  - Listar impresoras`);
  console.log(`  POST /print     - Imprimir factura`);
  console.log(`  POST /test      - Prueba de impresión`);
  console.log('');
  
  // Intentar conectar impresora
  initPrinter();
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesa rechazada:', error);
});
