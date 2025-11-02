#!/usr/bin/env node

/**
 * Inicia el visualizador de base de datos en localhost
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3001;
const VIEWER_DIR = path.join(__dirname, 'db-viewer');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(VIEWER_DIR, req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 - Archivo no encontrado');
      } else {
        res.writeHead(500);
        res.end('500 - Error del servidor');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\n🎨 Database Viewer Iniciado');
  console.log('='.repeat(60));
  console.log(`🔗 URL: ${url}`);
  console.log(`📂 Directorio: ${VIEWER_DIR}`);
  console.log('='.repeat(60));
  console.log('\n💡 Características:');
  console.log('  ✅ Visualización de todas las tablas');
  console.log('  ✅ Búsqueda en tiempo real');
  console.log('  ✅ Exportar a JSON');
  console.log('  ✅ Interfaz moderna y responsive');
  console.log('\n⚠️  Presiona Ctrl+C para detener el servidor\n');

  // Intentar abrir en el navegador
  const openCommand = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';

  exec(`${openCommand} ${url}`, (error) => {
    if (error) {
      console.log('⚠️  Abre manualmente esta URL en tu navegador:', url);
    }
  });
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando servidor...\n');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente\n');
    process.exit(0);
  });
});
