#!/bin/bash

SUPABASE_URL="https://supabase.chamosbarber.com"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNTc4NjgwMCwiZXhwIjo0ODkxNDYwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.L08vuRi-TbqEi8OQnPl_njLRiNxjO5N2Gvxq8C9Lwkk"

EMAIL="admin@chamosbarber.com"
PASSWORD="Admin123!"

echo "=== Verificando si usuario admin existe ==="

# Listar todos los usuarios y buscar el admin
response=$(curl -s "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Usuarios existentes:"
echo "$response" | jq -r '.users[] | select(.email=="admin@chamosbarber.com") | {id, email, email_confirmed_at}'

# Extraer el ID del usuario admin si existe
ADMIN_ID=$(echo "$response" | jq -r '.users[] | select(.email=="admin@chamosbarber.com") | .id')

if [ -z "$ADMIN_ID" ] || [ "$ADMIN_ID" == "null" ]; then
  echo -e "\n=== Usuario admin NO existe. Creando... ==="
  
  # Crear nuevo usuario admin
  create_response=$(curl -s -X POST \
    "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${EMAIL}\",
      \"password\": \"${PASSWORD}\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"rol\": \"admin\"
      }
    }")
  
  echo "Respuesta de creación:"
  echo "$create_response" | jq '.'
  
  NEW_ADMIN_ID=$(echo "$create_response" | jq -r '.id')
  echo -e "\n✅ Usuario admin creado con ID: $NEW_ADMIN_ID"
  echo "📧 Email: ${EMAIL}"
  echo "🔑 Password: ${PASSWORD}"
  
else
  echo -e "\n=== Usuario admin existe con ID: $ADMIN_ID ==="
  echo "=== Actualizando contraseña... ==="
  
  # Actualizar contraseña del usuario existente
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
  
  echo -e "\n✅ Contraseña actualizada"
  echo "📧 Email: ${EMAIL}"
  echo "🔑 Password: ${PASSWORD}"
fi

echo -e "\n=== Credenciales finales ==="
echo "Email: ${EMAIL}"
echo "Password: ${PASSWORD}"
echo "Rol: admin"
