@echo off
echo ===================================================
3: echo GENERANDO EJECUTABLE PARA CHAMOS BARBER
4: echo ===================================================
5: echo.
6: echo 1. Instalando dependencias necesarias...
7: call npm install
8: echo.
9: echo 2. Instalando PKG para generar ejecutable...
10: call npm install -g pkg
11: echo.
12: echo 3. Generando chamos-printer.exe...
13: call npm run build-exe
14: echo.
15: echo ===================================================
16: echo PROCESO COMPLETADO
17: echo Busca el archivo "chamos-printer.exe" en esta carpeta.
18: echo ===================================================
19: pause
20: 
