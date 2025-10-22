#!/bin/bash

# Script de despliegue para Chamos Barber Next.js en VPS
# Uso: ./deploy.sh

set -e  # Salir si algún comando falla

echo "🚀 Iniciando despliegue de Chamos Barber..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
APP_NAME="chamos-barber"
APP_DIR="/var/www/chamos-barber"
NODE_ENV="production"
PORT="3000"

# Función para mostrar mensajes
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado. Por favor instala Node.js 18+ antes de continuar."
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    error "Node.js versión 18+ es requerida. Versión actual: $NODE_VERSION"
fi

# Crear directorio si no existe
log "Creando directorio de aplicación..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Navegar al directorio de la aplicación
cd $APP_DIR

# Si es la primera vez, clonar o si ya existe, actualizar
if [ ! -d ".git" ]; then
    log "Primera instalación - configurando archivos..."
    # Aquí copiarías los archivos del proyecto
    # git clone <tu-repositorio> .
else
    log "Actualizando código..."
    git pull origin main
fi

# Instalar dependencias
log "Instalando dependencias de Node.js..."
npm ci --only=production

# Construir la aplicación
log "Construyendo aplicación Next.js..."
npm run build

# Crear directorio para logs
log "Configurando logs..."
mkdir -p logs
touch logs/app.log logs/out.log logs/error.log

# Crear directorio para base de datos
log "Configurando base de datos..."
mkdir -p data

# Configurar variables de entorno
log "Configurando variables de entorno..."
cat > .env.production << EOF
NODE_ENV=production
PORT=$PORT
DATABASE_PATH=$APP_DIR/data/chamos-barber.db
EOF

# Detener aplicación si está corriendo
log "Deteniendo aplicación anterior..."
if command -v pm2 &> /dev/null; then
    pm2 stop $APP_NAME || true
    pm2 delete $APP_NAME || true
else
    warn "PM2 no está instalado. Instalando PM2..."
    npm install -g pm2
fi

# Iniciar aplicación con PM2
log "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configurar Nginx (opcional)
if command -v nginx &> /dev/null; then
    log "Configurando Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/$APP_NAME
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
else
    warn "Nginx no encontrado. La aplicación estará disponible en el puerto $PORT"
fi

# Configurar firewall (opcional)
if command -v ufw &> /dev/null; then
    log "Configurando firewall..."
    sudo ufw allow $PORT/tcp
    sudo ufw allow 'Nginx Full' || true
    sudo ufw --force enable || true
fi

log "✅ Despliegue completado exitosamente!"
log "🌐 Aplicación disponible en:"
log "   - http://localhost:$PORT (directo)"
if command -v nginx &> /dev/null; then
    log "   - http://tu-dominio.com (a través de Nginx)"
fi

log "📊 Monitoreo:"
log "   - Logs: pm2 logs $APP_NAME"
log "   - Status: pm2 status"
log "   - Restart: pm2 restart $APP_NAME"

log "🔧 Comandos útiles:"
log "   - Ver logs en tiempo real: pm2 logs $APP_NAME --lines 100"
log "   - Reiniciar aplicación: pm2 restart $APP_NAME"
log "   - Detener aplicación: pm2 stop $APP_NAME"