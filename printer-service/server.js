const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const escpos = require('escpos');

// Instalar adaptadores según el SO
// npm install escpos-usb
escpos.USB = require('escpos-usb');
// escpos.Network = require('escpos-network');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Variable global para el dispositivo
let device = null;
let printer = null;

// Intentar conectar a la impresora USB al inicio
function connectPrinter() {
    try {
        // Busca la primera impresora USB conectada
        // En Windows puede requerir instalar drivers WinUSB con Zadig
        device = new escpos.USB();
        printer = new escpos.Printer(device);
        console.log('✅ Impresora USB detectada');
        return true;
    } catch (e) {
        console.warn('⚠️ No se detectó impresora USB (o requiere permisos/drivers):', e.message);
        return false;
    }
}

connectPrinter();

// Endpoint de estado para que el frontend sepa si el servicio corre
app.get('/status', (req, res) => {
    const isConnected = !!(device && device.endpoint);
    res.json({ 
        status: 'online', 
        printer_connected: isConnected,
        message: isConnected ? 'Servicio activo y impresora lista' : 'Servicio activo, pero impresora no detectada'
    });
});

// Endpoint para abrir cajón de dinero (sin imprimir)
app.post('/open-drawer', (req, res) => {
    if (!device) {
        if (!connectPrinter()) {
            return res.status(500).json({ error: 'No hay impresora conectada' });
        }
    }

    try {
        device.open(function(error) {
            if (error) {
                console.error('Error abriendo puerto:', error);
                return res.status(500).json({ error: 'Error abriendo puerto impresora' });
            }

            printer
                .cashdraw(2) // Pin 2 (estándar)
                .close();
            
            res.json({ success: true, message: 'Cajón abierto' });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para imprimir factura
app.post('/print', (req, res) => {
    const { factura } = req.body;

    if (!factura) {
        return res.status(400).json({ error: 'Faltan datos de la factura' });
    }

    if (!device) {
        if (!connectPrinter()) {
            return res.status(500).json({ error: 'No hay impresora conectada' });
        }
    }

    try {
        device.open(function(error) {
            if (error) {
                console.error('Error abriendo puerto:', error);
                return res.status(500).json({ error: 'Error abriendo puerto impresora' });
            }

            // Diseño del ticket
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
                .text('Tel: +56 9 XXXX XXXX')
                .text('www.chamosbarber.com')
                .feed(1)
                .align('lt')
                .text(`Fecha: ${new Date(factura.created_at).toLocaleString('es-CL')}`)
                .text(`Cliente: ${factura.cliente_nombre}`)
                .text(`Barbero: ${factura.barbero?.nombre || 'General'}`)
                .text('--------------------------------')
                .align('ct')
                .text(factura.tipo_documento === 'factura' ? 'FACTURA' : 'BOLETA')
                .text(`NRO: ${factura.numero_factura}`)
                .align('lt')
                .text('--------------------------------')
                .text('CANT  DESCRIPCION       PRECIO')
                .text('--------------------------------');

            // Items
            factura.items.forEach(item => {
                const nombre = item.nombre.substring(0, 15).padEnd(15);
                const precio = `$${item.subtotal}`.padStart(10);
                printer.text(`${item.cantidad}x    ${nombre} ${precio}`);
            });

            printer
                .text('--------------------------------')
                .align('rt')
                .size(1, 1)
                .text(`TOTAL: $${factura.total.toLocaleString('es-CL')}`)
                .size(0, 0)
                .text(`Pago: ${factura.metodo_pago}`)
                .feed(1)
                .align('ct')
                .text('GRACIAS POR SU PREFERENCIA!')
                .text('@chamosbarber')
                .feed(2)
                .cut()
                .cashdraw(2) // Abrir cajón al finalizar
                .close();

            res.json({ success: true });
        });
    } catch (e) {
        console.error('Error de impresión:', e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🖨️  Servicio de impresión local corriendo en http://localhost:${PORT}`);
    console.log('💡 Mantén esta ventana abierta para imprimir directo.');
});
