const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const escpos = require('escpos');

// Instalar adaptadores según el SO
try {
    escpos.USB = require('escpos-usb');
} catch (e) {
    console.error('❌ Error cargando escpos-usb:', e.message);
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Variable global para el dispositivo
let device = null;
let printer = null;

// Intentar conectar a la impresora USB
function connectPrinter(vid, pid) {
    try {
        if (vid && pid) {
            console.log(`🔍 Buscando impresora específica VID: ${vid}, PID: ${pid}`);
            device = new escpos.USB(parseInt(vid), parseInt(pid));
        } else {
            console.log('🔍 Buscando cualquier impresora USB...');
            device = new escpos.USB();
        }

        printer = new escpos.Printer(device);
        console.log('✅ Impresora USB detectada e inicializada');
        return true;
    } catch (e) {
        console.warn('⚠️ No se detectó impresora USB:', e.message);
        device = null;
        printer = null;
        return false;
    }
}

connectPrinter();

// Endpoint de estado
app.get('/status', (req, res) => {
    const isConnected = !!(device);
    res.json({
        status: 'online',
        printer_connected: isConnected,
        message: isConnected ? 'Servicio activo e impresora lista' : 'Servicio activo, pero impresora no detectada'
    });
});

// Endpoint para listar dispositivos USB (ayuda a configurar VID/PID)
app.get('/devices', (req, res) => {
    try {
        const devices = escpos.USB.findPrinter();
        res.json({ success: true, devices });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Endpoint para abrir cajón de dinero (sin imprimir)
app.post('/open-drawer', (req, res) => {
    const { vid, pid } = req.query;

    if (!device) {
        if (!connectPrinter(vid, pid)) {
            return res.status(500).json({ error: 'No hay impresora conectada' });
        }
    }

    try {
        device.open(function (error) {
            if (error) {
                console.error('❌ Error abriendo puerto para cajón:', error);
                device = null;
                return res.status(500).json({ error: 'Error abriendo puerto impresora: ' + error.message });
            }

            printer
                .cashdraw(2)
                .close(() => {
                    console.log('✅ Cajón abierto exitosamente');
                    try { device.close(); } catch (e) { }
                    device = null;
                });

            res.json({ success: true, message: 'Comando de apertura enviado' });
        });
    } catch (e) {
        console.error('❌ Catch en open-drawer:', e);
        if (device) { try { device.close(); } catch (e2) { } }
        device = null;
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para imprimir factura
app.post('/print', (req, res) => {
    const { factura } = req.body;
    const { vid, pid } = req.query;

    if (!factura) {
        return res.status(400).json({ error: 'Faltan datos de la factura' });
    }

    if (!device) {
        if (!connectPrinter(vid, pid)) {
            return res.status(500).json({ error: 'No hay impresora conectada' });
        }
    }

    try {
        device.open(function (error) {
            if (error) {
                console.error('Error abriendo puerto:', error);
                device = null;
                return res.status(500).json({ error: 'Error abriendo puerto impresora' });
            }

            console.log(`🖨️ Imprimiendo factura: ${factura.numero_factura}`);

            printer
                .font('a')
                .align('ct')
                .style('b')
                .size(1, 1)
                .text('CHAMOS BARBER')
                .size(0, 0)
                .text('Barberia Profesional')
                .text('--------------------------------')
                .style('n')
                .text('Rancagua 759, San Fernando')
                .text('www.chamosbarber.com')
                .feed(1)
                .align('lt')
                .text(`Fecha: ${new Date(factura.created_at).toLocaleString('es-CL')}`)
                .text(`Cliente: ${factura.cliente_nombre}`)
            if (factura.barbero) {
                printer.text(`Barbero: ${factura.barbero.nombre} ${factura.barbero.apellido}`);
            }
            printer
                .text('--------------------------------')
                .align('ct')
                .style('b')
                .text(factura.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA')
                .text(factura.numero_factura)
                .style('n')
                .align('lt')
                .text('--------------------------------')
                .text('CANT  DESCRIPCION       PRECIO')
                .text('--------------------------------');

            // Items
            if (factura.items && Array.isArray(factura.items)) {
                factura.items.forEach(item => {
                    const nombre = (item.nombre || item.servicio || '').substring(0, 16).padEnd(16);
                    const precio = `$${(item.subtotal || item.precio || 0).toLocaleString('es-CL')}`.padStart(10);
                    printer.text(`${(item.cantidad || 1).toString().padEnd(3)}x  ${nombre} ${precio}`);
                });
            }

            printer
                .text('--------------------------------')
                .align('rt')
                .size(1, 1)
                .style('b')
                .text(`TOTAL: $${(factura.total || 0).toLocaleString('es-CL')}`)
                .size(0, 0)
                .style('n')
                .text(`Metodo de pago: ${factura.metodo_pago}`)
                .feed(1)
                .align('ct')
                .text('¡GRACIAS POR TU PREFERENCIA!')
                .text('Esperamos verte pronto')
                .text('@chamosbarber')
                .feed(2)
                .cashdraw(2) // Abrir cajón antes de cortar y cerrar
                .cut()
                .close(() => {
                    console.log(`✅ Factura ${factura.numero_factura} impresa y cajón abierto`);
                    // El dispositivo se cierra automáticamente con printer.close() si el adapter lo soporta
                    // pero para mayor seguridad en este adapter escpos-usb:
                    try { device.close(); } catch (e) { }
                    device = null; // Limpiar para permitir reconexión limpia
                });

            res.json({ success: true });
        });
    } catch (e) {
        console.error('❌ Error crítico en endpoint /print:', e);
        if (device) { try { device.close(); } catch (e2) { } }
        device = null;
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🖨️  CHAMOS PRINTER SERVICE v1.1`);
    console.log(`🌐 Corriendo en http://localhost:${PORT}`);
    console.log('=========================================');
    console.log('💡 Mantén esta ventana abierta.');
    console.log('💡 Para Windows: Usa Zadig para instalar driver WinUSB.');
});
