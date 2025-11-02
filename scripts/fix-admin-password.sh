#!/bin/bash

SUPABASE_URL="https://supabase.chamosbarber.com"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0"

EMAIL="admin@chamosbarber.com"
PASSWORD="ChamosAdmin2024!"
ADMIN_ID="fdf8d449-a8fb-440f-b445-40209f396bb6"

echo "=== Actualizando contraseña del admin a la original ==="

# Actualizar contraseña
update_response=$(curl -s -X PUT \
  "${SUPABASE_URL}/auth/v1/admin/users/${ADMIN_ID}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true
  }")

echo "Respuesta de actualización:"
echo "$update_response" | jq '.'

echo -e "\n✅ Contraseña actualizada correctamente"
echo "📧 Email: ${EMAIL}"
echo "🔑 Password: ${PASSWORD}"
