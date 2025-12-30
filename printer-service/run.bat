@echo off
echo ===================================================
echo INICIANDO SERVICIO DE IMPRESION - CHAMOS BARBER
echo ===================================================
echo.

if exist chamos-printer.exe (
    echo Usando ejecutable independiente...
    chamos-printer.exe
) else (
    echo Usando Node.js (asegúrate de tenerlo instalado)...
    node server.js
)

pause
