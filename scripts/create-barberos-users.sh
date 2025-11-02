#!/bin/bash

##############################################################################
# Script para crear usuarios de barberos usando Supabase Admin API
# Usa curl para mayor confiabilidad
##############################################################################

set -e  # Exit on error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SUPABASE_URL="https://supabase.chamosbarber.com"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0"
PASSWORD="Temporal123!"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 CREACIÓN DE USUARIOS - SISTEMA DE ROLES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Array de barberos
declare -A BARBEROS
BARBEROS["carlos@chamosbarber.com"]="Carlos Ramírez"
BARBEROS["miguel@chamosbarber.com"]="Miguel Torres"
BARBEROS["luis@chamosbarber.com"]="Luis Mendoza"
BARBEROS["jorge@chamosbarber.com"]="Jorge Silva"

# Contador de éxitos
SUCCESS_COUNT=0
TOTAL_COUNT=${#BARBEROS[@]}

# Crear cada usuario
for email in "${!BARBEROS[@]}"; do
  name="${BARBEROS[$email]}"
  
  echo -e "${BLUE}➤${NC} Creando usuario: ${name} (${email})"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true,\"user_metadata\":{\"name\":\"${name}\"}}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo -e "  ${GREEN}✅ Usuario creado exitosamente${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif echo "$body" | grep -q "already\|exists\|duplicate"; then
    echo -e "  ${YELLOW}⚠️  Usuario ya existe (esto es normal)${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "  ${RED}❌ Error (HTTP ${http_code})${NC}"
    echo -e "  ${RED}   Respuesta: ${body}${NC}"
  fi
  
  echo ""
  sleep 1  # Evitar rate limiting
done

echo "════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ PROCESO COMPLETADO: ${SUCCESS_COUNT}/${TOTAL_COUNT} usuarios${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}📝 CREDENCIALES DE ACCESO:${NC}"
echo ""
for email in "${!BARBEROS[@]}"; do
  name="${BARBEROS[$email]}"
  printf "   %-20s %s / %s\n" "${name}:" "${email}" "${PASSWORD}"
done

echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASOS OBLIGATORIOS:${NC}"
echo ""
echo "1. Ve a Supabase Studio: https://supabase.chamosbarber.com"
echo "2. Navega a: SQL Editor"
echo "3. Ejecuta el script: scripts/setup-roles-system.sql"
echo "4. Ejecuta el script: scripts/associate-barberos-users.sql"
echo ""
echo -e "${GREEN}5. ¡Listo! Prueba iniciando sesión con: carlos@chamosbarber.com / Temporal123!${NC}"
echo ""
echo "════════════════════════════════════════════════════════════════"
