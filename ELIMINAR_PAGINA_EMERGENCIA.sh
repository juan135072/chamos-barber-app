#!/bin/bash
# Script para eliminar la página de emergencia después de usarla

echo "🗑️  Eliminando página de emergencia..."

rm src/pages/admin-reset-emergency.tsx

git add src/pages/admin-reset-emergency.tsx
git commit -m "security: remove emergency reset page after successful use"
git push origin main

echo "✅ Página eliminada"
echo "⚠️  Recuerda hacer Redeploy en Coolify para aplicar los cambios"
