const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const escpos = require('escpos');
const EventEmitter = require('events');

// --- PARCHE DE COMPATIBILIDAD GLOBAL ---
try {
    // Intentamos cargar el módulo usb de bajo nivel que usa escpos-usb
    const usbLowLevel = require('usb');
    if (usbLowLevel && typeof usbLowLevel.on !== 'function') {
        console.log("🛠️ Parcheando núcleo USB (ignorar hotplug events)");
        usbLowLevel.on = usbLowLevel.addListener = usbLowLevel.removeListener = usbLowLevel.removeAllListeners = () => { };
    }
} catch (e) {
    console.warn("⚠️ No se pudo parchear el módulo 'usb' directamente, se intentará de forma indirecta.");
}

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

// Middleware para LOGS VERBOSOS
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

let device = null;
let printer = null;

// Función para asegurar que el dispositivo sea un EventEmitter (Capa extra de seguridad)
function patchEventEmitter(obj) {
    if (obj && typeof obj.on !== 'function') {
        console.log("🛠️ Aplicando parche de compatibilidad EventEmitter al dispositivo...");
        Object.setPrototypeOf(obj, EventEmitter.prototype);
    }
    return obj;
}

function connectPrinter(vid, pid) {
    try {
        console.log("🔍 Escaneando puertos USB...");
        if (!escpos.USB) throw new Error("Adaptador USB no cargado.");

        const devices = escpos.USB.findPrinter();
        if (!devices || devices.length === 0) {
            console.log("⚠️ No se detectaron impresoras USB encendidas.");
            return false;
        }

        // IDs específicos del usuario (VID: 1155/0x0483, PID: 22304/0x5720)
        const targetVid = vid || 0x0483;
        const targetPid = pid || 0x5720;

        const found = devices.find(d =>
            d.deviceDescriptor.idVendor === targetVid &&
            d.deviceDescriptor.idProduct === targetPid
        );

        if (found) {
            console.log(`🎯 Impresora coincidente encontrada (VID: ${targetVid}, PID: ${targetPid})`);
            // El error "usb.on" solía ocurrir AQUÍ en el constructor
            device = new escpos.USB(targetVid, targetPid);
        } else {
            console.log("ℹ️ Usando selección automática del primer dispositivo USB disponible.");
            device = new escpos.USB();
        }

        // PARCHE CRÍTICO: Evita error 'usb.on is not a function' si el constructor no falló pero el objeto es incompleto
        device = patchEventEmitter(device);

        printer = new escpos.Printer(device);
        console.log('✅ Impresora USB lista y vinculada');
        return true;
    } catch (e) {
        console.error('❌ Error fatal al conectar:', e.message);
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
                console.log('✅ Cajón abierto (Comandos 2 y 5 enviados)');
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
            console.log(`🖨️ Imprimiendo factura: ${factura.numero_factura}`);
            printer.font('a').align('ct').style('b').size(1, 1)
                .cashdraw(2).cashdraw(5) // Apertura rápida
                .text('CHAMOS BARBER').size(0, 0)
                .text('--------------------------------')
                .align('lt').text(`Doc: ${factura.numero_factura}`)
                .text(`Cliente: ${factura.cliente_nombre}`)
                .text('--------------------------------');

            if (factura.items) {
                factura.items.forEach(item => {
                    printer.text(`${item.cantidad}x ${item.nombre || item.servicio} $${(item.subtotal || 0).toLocaleString('es-CL')}`);
                });
            }

            printer.text('--------------------------------').align('rt').size(1, 1).style('b')
                .text(`TOTAL: $${(factura.total || 0).toLocaleString('es-CL')}`)
                .size(0, 0).style('n').feed(2).cut()
                .close(() => {
                    console.log(`✅ Impresión finalizada con éxito`);
                    try { device.close(); } catch (e) { }
                    device = null;
                });
            res.json({ success: true });
        });
    } catch (e) { device = null; res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🖨️  CHAMOS PRINTER SERVICE v1.1 PRO EX 4.0`);
    console.log(`🌐 Corriendo en http://localhost:${PORT}`);
    console.log('=========================================');
});
