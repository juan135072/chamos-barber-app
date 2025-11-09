@echo off
echo ========================================
echo Instalador del Servicio de Impresion
echo ========================================
echo.

echo [1/3] Instalando dependencias de Node.js...
call npm install
if %errorlevel% neq 0 (
    echo Error instalando dependencias
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando impresora...
echo Asegurate de que la impresora POS-8250 este conectada por USB
pause

echo.
echo [3/3] Instalacion completada!
echo.
echo Para iniciar el servicio, ejecuta:
echo     npm start
echo.
echo O para instalarlo como servicio permanente:
echo     npm install -g pm2
echo     pm2 start server.js --name printer-service
echo     pm2 save
echo.
pause
