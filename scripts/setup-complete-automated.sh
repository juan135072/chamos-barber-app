#!/bin/bash

# ============================================
# SCRIPT: Configuración Automática del Sistema de Roles
# ============================================
# Este script ejecuta todos los pasos necesarios de forma automática
# Requiere que proporciones las credenciales de Supabase
# ============================================

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 CONFIGURACIÓN AUTOMÁTICA - SISTEMA DE ROLES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================
# PASO 0: Verificar herramientas necesarias
# ============================================

print_info "Verificando herramientas necesarias..."

if ! command -v psql &> /dev/null; then
    print_warning "psql no está instalado. Instalando..."
    sudo apt-get update && sudo apt-get install -y postgresql-client
fi

if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado"
    exit 1
fi

print_success "Herramientas verificadas"
echo ""

# ============================================
# PASO 1: Solicitar credenciales de Supabase
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  📝 PASO 1: Credenciales de Supabase"
echo "════════════════════════════════════════════════════════════════"
echo ""

print_info "Necesito las credenciales de tu proyecto Supabase"
print_info "Las puedes encontrar en: Settings → Database → Connection String"
echo ""

read -p "🔗 Host de Supabase (ej: supabase.chamosbarber.com): " SUPABASE_HOST
read -p "🗄️  Database Name (ej: postgres): " SUPABASE_DB
read -p "👤 Database User (ej: postgres): " SUPABASE_USER
read -sp "🔑 Database Password: " SUPABASE_PASSWORD
echo ""
read -p "🔌 Database Port (por defecto 5432): " SUPABASE_PORT
SUPABASE_PORT=${SUPABASE_PORT:-5432}

echo ""
read -p "🔑 Supabase Service Role Key (para crear usuarios): " SUPABASE_SERVICE_KEY
echo ""

print_success "Credenciales capturadas"
echo ""

# ============================================
# PASO 2: Ejecutar setup-roles-system.sql
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  🗄️  PASO 2: Ejecutando setup-roles-system.sql"
echo "════════════════════════════════════════════════════════════════"
echo ""

print_info "Conectando a la base de datos..."

export PGPASSWORD="$SUPABASE_PASSWORD"

psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -p "$SUPABASE_PORT" \
     -f scripts/setup-roles-system.sql

if [ $? -eq 0 ]; then
    print_success "SQL ejecutado: setup-roles-system.sql"
else
    print_error "Error al ejecutar setup-roles-system.sql"
    exit 1
fi

echo ""

# ============================================
# PASO 3: Crear usuarios en Supabase Auth
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  👥 PASO 3: Creando usuarios en Supabase Auth"
echo "════════════════════════════════════════════════════════════════"
echo ""

SUPABASE_URL="https://${SUPABASE_HOST}"

# Array de barberos
declare -a BARBEROS=(
    "carlos@chamosbarber.com:Carlos Ramírez"
    "miguel@chamosbarber.com:Miguel Torres"
    "luis@chamosbarber.com:Luis Mendoza"
    "jorge@chamosbarber.com:Jorge Silva"
)

PASSWORD="Temporal123!"

for BARBERO in "${BARBEROS[@]}"; do
    EMAIL="${BARBERO%%:*}"
    NAME="${BARBERO##*:}"
    
    print_info "Creando usuario: $NAME ($EMAIL)"
    
    # Crear usuario via Supabase Admin API
    RESPONSE=$(curl -s -X POST \
        "${SUPABASE_URL}/auth/v1/admin/users" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${EMAIL}\",
            \"password\": \"${PASSWORD}\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"name\": \"${NAME}\"
            }
        }")
    
    if echo "$RESPONSE" | grep -q "\"id\""; then
        print_success "Usuario creado: $EMAIL"
    else
        print_warning "Usuario ya existe o error: $EMAIL"
        print_info "Respuesta: $RESPONSE"
    fi
    
    sleep 1  # Evitar rate limiting
done

echo ""
print_success "Todos los usuarios procesados"
echo ""

# ============================================
# PASO 4: Ejecutar associate-barberos-users.sql
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  🔗 PASO 4: Ejecutando associate-barberos-users.sql"
echo "════════════════════════════════════════════════════════════════"
echo ""

print_info "Esperando 5 segundos para asegurar sincronización..."
sleep 5

print_info "Conectando a la base de datos..."

psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -p "$SUPABASE_PORT" \
     -f scripts/associate-barberos-users.sql

if [ $? -eq 0 ]; then
    print_success "SQL ejecutado: associate-barberos-users.sql"
else
    print_error "Error al ejecutar associate-barberos-users.sql"
    exit 1
fi

echo ""

# ============================================
# PASO 5: Verificación
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  ✅ PASO 5: Verificación Final"
echo "════════════════════════════════════════════════════════════════"
echo ""

print_info "Verificando usuarios creados..."

psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -p "$SUPABASE_PORT" \
     -c "SELECT email, rol, activo FROM admin_users ORDER BY rol, email;"

echo ""

# ============================================
# RESUMEN FINAL
# ============================================

echo "════════════════════════════════════════════════════════════════"
echo "  🎉 CONFIGURACIÓN COMPLETADA"
echo "════════════════════════════════════════════════════════════════"
echo ""

print_success "Sistema de roles configurado exitosamente!"
echo ""

echo "📝 CREDENCIALES DE ACCESO:"
echo ""
echo "👑 ADMIN (Dueño):"
echo "   Email: admin@chamosbarber.com"
echo "   Password: [tu contraseña actual]"
echo "   Panel: https://chamosbarber.com/admin"
echo ""

echo "✂️  BARBEROS:"
echo "   Carlos: carlos@chamosbarber.com / ${PASSWORD}"
echo "   Miguel: miguel@chamosbarber.com / ${PASSWORD}"
echo "   Luis: luis@chamosbarber.com / ${PASSWORD}"
echo "   Jorge: jorge@chamosbarber.com / ${PASSWORD}"
echo "   Panel: https://chamosbarber.com/barbero-panel"
echo ""

print_warning "IMPORTANTE: Los barberos deben cambiar su contraseña"
print_warning "después del primer inicio de sesión!"
echo ""

print_info "Guardando credenciales en: credentials.txt"
cat > credentials.txt << EOF
════════════════════════════════════════════════════════════════
  CREDENCIALES DEL SISTEMA - Chamos Barber
════════════════════════════════════════════════════════════════

👑 ADMIN (Dueño):
   Email: admin@chamosbarber.com
   Password: [tu contraseña actual]
   Panel: https://chamosbarber.com/admin

✂️  BARBEROS:
   Carlos Ramírez:
   Email: carlos@chamosbarber.com
   Password: ${PASSWORD}
   Panel: https://chamosbarber.com/barbero-panel

   Miguel Torres:
   Email: miguel@chamosbarber.com
   Password: ${PASSWORD}
   Panel: https://chamosbarber.com/barbero-panel

   Luis Mendoza:
   Email: luis@chamosbarber.com
   Password: ${PASSWORD}
   Panel: https://chamosbarber.com/barbero-panel

   Jorge Silva:
   Email: jorge@chamosbarber.com
   Password: ${PASSWORD}
   Panel: https://chamosbarber.com/barbero-panel

⚠️  IMPORTANTE: 
- Los barberos deben cambiar su contraseña después del primer login
- Guarda este archivo en un lugar seguro
- No compartas las credenciales por canales inseguros

Fecha de creación: $(date)
════════════════════════════════════════════════════════════════
EOF

print_success "Credenciales guardadas en: credentials.txt"
echo ""

print_info "PRÓXIMOS PASOS:"
echo "1. Espera el deployment de Coolify (~5 minutos)"
echo "2. Prueba el login como barbero: carlos@chamosbarber.com"
echo "3. Verifica el acceso al panel: /barbero-panel"
echo "4. Comparte credenciales con tus barberos"
echo "5. Pídeles que cambien su contraseña"
echo ""

print_success "¡Todo listo! 🎊"
echo ""

# Limpiar variable de password
unset PGPASSWORD
