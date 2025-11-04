#!/bin/bash

SUPABASE_URL="https://supabase.chamosbarber.com"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0"

echo "=== Ejecutando SQL para eliminar recursión RLS ==="

# Ejecutar cada comando SQL por separado
echo -e "\n1. Eliminando políticas existentes..."

curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "DROP POLICY IF EXISTS \"admin_users_select_policy\" ON admin_users; DROP POLICY IF EXISTS \"admin_users_authenticated_select\" ON admin_users; DROP POLICY IF EXISTS \"admin_users_select_own\" ON admin_users; DROP POLICY IF EXISTS \"Users can read their own admin data\" ON admin_users; DROP POLICY IF EXISTS \"Admin users can read their own data\" ON admin_users; DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON admin_users;"
  }' | jq '.'

echo -e "\n2. Deshabilitando RLS..."

curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;"
  }' | jq '.'

echo -e "\n3. Habilitando RLS y creando política simple..."

curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY; CREATE POLICY \"admin_users_simple_select\" ON admin_users FOR SELECT TO authenticated USING (id = auth.uid());"
  }' | jq '.'

echo -e "\n✅ Fix completado. Intenta hacer login nuevamente."
