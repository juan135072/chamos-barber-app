const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const escpos = require('escpos');
const EventEmitter = require('events');

// --- PARCHE DE COMPATIBILIDAD GLOBAL ---
try {
    const usbLowLevel = require('usb');
    if (usbLowLevel && typeof usbLowLevel.on !== 'function') {
        usbLowLevel.on = usbLowLevel.addListener = usbLowLevel.removeListener = usbLowLevel.removeAllListeners = () => { };
    }
} catch (e) { }

try {
    escpos.USB = require('escpos-usb');
} catch (e) {
    console.error('❌ Error cargando escpos-usb:', e.message);
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

let device = null;
let printer = null;

function patchEventEmitter(obj) {
    if (obj && typeof obj.on !== 'function') {
        Object.setPrototypeOf(obj, EventEmitter.prototype);
    }
    return obj;
}

function connectPrinter(vid, pid) {
    try {
        if (!escpos.USB) return false;
        const devices = escpos.USB.findPrinter();
        if (!devices || devices.length === 0) return false;

        const targetVid = vid || 0x0483;
        const targetPid = pid || 0x5720;

        const found = devices.find(d =>
            d.deviceDescriptor.idVendor === targetVid &&
            d.deviceDescriptor.idProduct === targetPid
        );

        if (found) {
            device = new escpos.USB(targetVid, targetPid);
        } else {
            device = new escpos.USB();
        }

        device = patchEventEmitter(device);
        // Usamos codificación Latin1 para evitar que caracteres especiales activen modos multibyte
        printer = new escpos.Printer(device, { encoding: 'ISO-8859-1' });
        return true;
    } catch (e) {
        device = null;
        printer = null;
        return false;
    }
}

connectPrinter();

app.get('/status', (req, res) => {
    res.json({ status: 'online', printer_connected: !!device });
});

app.post('/open-drawer', (req, res) => {
    if (!device && !connectPrinter()) return res.status(500).json({ error: 'No hay impresora' });
    try {
        device.open((error) => {
            if (error) { device = null; return res.status(500).json({ error: error.message }); }
            printer.cashdraw(2).cashdraw(5).close(() => {
                try { device.close(); } catch (e) { }
                device = null;
            });
            res.json({ success: true });
        });
    } catch (e) { device = null; res.status(500).json({ error: e.message }); }
});

app.post('/print', (req, res) => {
    const { factura } = req.body;
    if (!device && !connectPrinter()) return res.status(500).json({ error: 'No hay impresora' });
    try {
        device.open((error) => {
            if (error) { device = null; return res.status(500).json({ error: 'Error de puerto' }); }

            console.log(`🖨️ Generando impresión v6.0 (Sin modo chino): ${factura.numero_factura}`);

            // --- COMANDOS DE INICIALIZACIÓN CRÍTICOS ---
            printer.pureText('\x1B\x40');   // ESC @ (Initialize printer)
            printer.pureText('\x1C\x2E');   // FS .  (CANCEL CHINESE CHAR MODE) - MUY IMPORTANTE
            printer.pureText('\x1B\x74\x10'); // ESC t 16 (Select WPC1252 / Latin 1)

            // APERTURA DE CAJÓN
            printer.cashdraw(2).cashdraw(5);

            // HEADER
            printer.align('ct').style('b').size(1, 1).text('CHAMOS BARBER').size(0, 0);
            printer.text('Barberia Profesional');
            printer.style('normal').text('Rancagua 759, San Fernando');
            printer.text("O'Higgins, Chile");
            printer.text('www.chamosbarber.com');
            printer.feed(1);

            // DETALLES DOCUMENTO
            const tipoDoc = (factura.tipo_documento || 'BOLETA').toUpperCase();
            printer.style('b').text('--------------------------------');
            printer.text(`${tipoDoc} N° ${factura.numero_factura}`);
            printer.style('normal').text('--------------------------------');

            const fecha = new Date(factura.created_at || Date.now());
            printer.align('lt').text(`Fecha: ${fecha.toLocaleDateString('es-CL')}`);
            printer.text(`Hora:  ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
            printer.text(`Cliente: ${factura.cliente_nombre}`);
            if (factura.barbero) {
                printer.text(`Barbero: ${factura.barbero.nombre} ${factura.barbero.apellido}`);
            }
            printer.feed(1);

            // ITEMS
            printer.style('b').text('CANT  DESCRIPCION         TOTAL');
            printer.style('normal').text('--------------------------------');

            if (factura.items) {
                factura.items.forEach(item => {
                    const cant = String(item.cantidad).padEnd(5, ' ');
                    const desc = (item.nombre || item.servicio || '').substring(0, 15).padEnd(16, ' ');
                    const sub = `$${(item.subtotal || 0).toLocaleString('es-CL')}`.padStart(10, ' ');
                    printer.text(`${cant}${desc}${sub}`);
                });
            }

            printer.text('--------------------------------');

            // TOTALES
            printer.align('rt').size(1, 1).style('b');
            printer.text(`TOTAL: $${(factura.total || 0).toLocaleString('es-CL')}`);
            printer.size(0, 0).style('normal').align('ct');
            printer.feed(1);

            // FOOTER
            printer.text('Metodo Pago: ' + (factura.metodo_pago || 'Efectivo').toUpperCase());
            printer.feed(1);
            printer.style('b').text('¡GRACIAS POR TU PREFERENCIA!');
            printer.style('normal').text('Siguenos en: @chamosbarber');
            printer.feed(3).cut().close(() => {
                try { device.close(); } catch (e) { }
                device = null;
            });

            res.json({ success: true });
        });
    } catch (e) {
        console.error('❌ Error en proceso de impresion:', e);
        device = null;
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🖨️  CHAMOS PRINTER SERVICE v1.1 PRO EX 6.0`);
    console.log(`🌐 Corriendo en http://localhost:${PORT}`);
    console.log('=========================================');
});
