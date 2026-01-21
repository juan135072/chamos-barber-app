@echo off
TITLE SERVICIO DE IMPRESION - CHAMOS BARBER
echo ==========================================
echo   INICIANDO SERVICIO DE IMPRESION...
echo ==========================================

cd printer-service

set NODE_BIN=bin\node.exe

if exist %NODE_BIN% (
    echo [OK] Usando motor de impresion interno...
    %NODE_BIN% server.js
) else (
    echo [ADVERTENCIA] No se encontro motor interno. Intentando con sistema...
    node server.js
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR CRITICO: No se pudo iniciar el servicio.
    echo Asegurate de haber extraido TODOS los archivos del ZIP.
    echo Tambien verifica que WinUSB este instalado con Zadig.
    pause
)
