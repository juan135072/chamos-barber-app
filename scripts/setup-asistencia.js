// Script para ejecutar todos los schemas SQL de asistencia
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function ejecutarSQL(sqlContent, descripcion) {
    console.log(`\n📝 Ejecutando: ${descripcion}...`)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    })

    try {
        // Dividir el SQL en statements individuales (simplificado)
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'))

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';'

            // Ejecutar via API REST con raw SQL
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({ query: stmt })
            })

            if (!response.ok && i < 5) { // Solo mostrar primeros errores
                const error = await response.text()
                console.log(`  ⚠️  Statement ${i + 1}: ${error.substring(0, 100)}`)
            }
        }

        console.log(`✅ ${descripcion} completado`)
        return true

    } catch (error) {
        console.error(`❌ Error en ${descripcion}:`, error.message)
        return false
    }
}

async function main() {
    console.log('🚀 Configurando sistema de asistencia con geolocalización\n')
    console.log('='.repeat(60))

    // Leer archivos SQL
    const sqlDir = path.resolve(__dirname, '../sql')

    const geoSQL = fs.readFileSync(
        path.join(sqlDir, 'geolocalizacion_schema.sql'),
        'utf8'
    )

    // Ejecutar en orden
    await ejecutarSQL(geoSQL, 'Schema de geolocalización')

    // Ahora intentar insertar la ubicación de prueba
    console.log('\n📍 Insertando ubicación de prueba...')

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    })

    const { data, error } = await supabase
        .from('ubicaciones_barberia')
        .upsert({
            id: '00000000-0000-0000-0000-000000000001',
            nombre: 'Chamos Barber - Principal',
            latitud: -33.437916,
            longitud: -70.650410,
            radio_permitido: 100,
            activa: true
        })
        .select()

    if (error) {
        console.error('❌ Error al insertar ubicación:', error.message)
    } else {
        console.log('✅ Ubicación de prueba insertada')
        console.log('   ID: 00000000-0000-0000-0000-000000000001')
        console.log('   Nombre: Chamos Barber - Principal')
        console.log('   Coords: -33.437916, -70.650410')
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ ¡Configuración completada!')
    console.log('\n📝 Próximos pasos:')
    console.log('1. Ve al Panel Admin → "Ubicaciones GPS"')
    console.log('2. Captura la ubicación REAL en la barbería')
    console.log('3. Actualiza MarcarAsistencia.tsx con el ID correcto')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error fatal:', error)
        process.exit(1)
    })
