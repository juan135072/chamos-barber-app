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
                console.error('Error abriendo puerto:', error);
                device = null; // Reset para reintentar después
                return res.status(500).json({ error: 'Error abriendo puerto impresora: ' + error.message });
            }

            printer
                .cashdraw(2)
                .close(() => {
                    console.log('✅ Cajón abierto');
                });

            res.json({ success: true, message: 'Comando de apertura enviado' });
        });
    } catch (e) {
        console.error('Catch en open-drawer:', e);
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
                .text('Barberia Profesional')
                .text('--------------------------------')
                .style('n')
                .text('Rancagua 759, San Fernando')
                .text('www.chamosbarber.com')
                .feed(1)
                .align('lt')
                .text(`Fecha: ${new Date(factura.created_at).toLocaleString('es-CL')}`)
                .text(`Cliente: ${factura.cliente_nombre}`)
                .text('--------------------------------')
                .align('ct')
                .text(factura.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA')
                .text(`NRO: ${factura.numero_factura}`)
                .align('lt')
                .text('--------------------------------')
                .text('CANT  DESCRIPCION       PRECIO')
                .text('--------------------------------');

            // Items
            if (factura.items && Array.isArray(factura.items)) {
                factura.items.forEach(item => {
                    const nombre = (item.nombre || item.servicio || '').substring(0, 15).padEnd(15);
                    const precio = `$${item.subtotal || item.precio || 0}`.padStart(10);
                    printer.text(`${item.cantidad || 1}x    ${nombre} ${precio}`);
                });
            }

            printer
                .text('--------------------------------')
                .align('rt')
                .size(1, 1)
                .text(`TOTAL: $${(factura.total || 0).toLocaleString('es-CL')}`)
                .size(0, 0)
                .text(`Pago: ${factura.metodo_pago}`)
                .feed(1)
                .align('ct')
                .text('GRACIAS POR SU PREFERENCIA!')
                .text('@chamosbarber')
                .feed(2)
                .cut()
                .cashdraw(2)
                .close();

            res.json({ success: true });
        });
    } catch (e) {
        console.error('Error de impresión:', e);
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
