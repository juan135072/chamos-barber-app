#!/bin/bash

echo "========================================"
echo "Instalador del Servicio de Impresión"
echo "========================================"
echo ""

echo "[1/4] Instalando dependencias del sistema..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detectado: Linux"
    sudo apt-get update
    sudo apt-get install -y build-essential libudev-dev
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detectado: macOS"
    brew install libusb
fi

echo ""
echo "[2/4] Instalando dependencias de Node.js..."
npm install

echo ""
echo "[3/4] Configurando permisos USB (Linux)..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Creando reglas udev..."
    echo 'SUBSYSTEM=="usb", MODE="0666"' | sudo tee /etc/udev/rules.d/99-escpos.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    echo "Reglas udev aplicadas"
fi

echo ""
echo "[4/4] ¡Instalación completada!"
echo ""
echo "Para iniciar el servicio, ejecuta:"
echo "    npm start"
echo ""
echo "O para instalarlo como servicio permanente:"
echo "    npm install -g pm2"
echo "    pm2 start server.js --name printer-service"
echo "    pm2 save"
echo "    pm2 startup"
echo ""
