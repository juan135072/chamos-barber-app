@echo off
setlocal
echo ===================================================
echo INICIANDO SERVICIO DE IMPRESION - CHAMOS BARBER
echo ===================================================
echo.

if exist bin\node.exe (
    echo Usando Node.js embebido...
    bin\node.exe server.js
) else if exist chamos-printer.exe (
    echo Usando ejecutable independiente...
    chamos-printer.exe
) else (
    echo Buscando Node.js en el sistema...
    node server.js
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: El servicio no pudo iniciarse.
    echo Asegurate de haber extraido todos los archivos del ZIP.
    pause
)
