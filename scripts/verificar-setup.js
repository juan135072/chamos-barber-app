// Script para verificar que todo el sistema GPS esté configurado
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verificarSistema() {
    console.log('🔍 Verificando configuración del sistema GPS...\n')
    console.log('='.repeat(60))

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    })

    let todoBien = true

    try {
        // 1. Verificar tabla claves_diarias
        console.log('\n📋 1. Verificando tabla claves_diarias...')
        const { data: claves, error: e1 } = await supabase
            .from('claves_diarias')
            .select('count')
            .limit(1)

        if (e1) {
            console.log('❌ Error:', e1.message)
            todoBien = false
        } else {
            console.log('✅ Tabla claves_diarias existe')
        }

        // 2. Verificar tabla asistencias
        console.log('\n📋 2. Verificando tabla asistencias...')
        const { data: asist, error: e2 } = await supabase
            .from('asistencias')
            .select('count')
            .limit(1)

        if (e2) {
            console.log('❌ Error:', e2.message)
            todoBien = false
        } else {
            console.log('✅ Tabla asistencias existe')
        }

        // 3. Verificar tabla ubicaciones_barberia
        console.log('\n📋 3. Verificando tabla ubicaciones_barberia...')
        const { data: ubic, error: e3 } = await supabase
            .from('ubicaciones_barberia')
            .select('*')

        if (e3) {
            console.log('❌ Error:', e3.message)
            todoBien = false
        } else {
            console.log('✅ Tabla ubicaciones_barberia existe')
            console.log(`   📍 Ubicaciones registradas: ${ubic.length}`)

            if (ubic.length > 0) {
                ubic.forEach(u => {
                    console.log(`   - ${u.nombre} (${u.latitud}, ${u.longitud}) - Radio: ${u.radio_permitido}m`)
                })
            }
        }

        // 4. Verificar columnas GPS en asistencias
        console.log('\n📋 4. Verificando columnas GPS en asistencias...')
        const { data: testGPS, error: e4 } = await supabase
            .from('asistencias')
            .select('latitud_registrada, longitud_registrada, distancia_metros, ubicacion_barberia_id')
            .limit(1)

        if (e4 && !e4.message.includes('0 rows')) {
            console.log('❌ Error:', e4.message)
            todoBien = false
        } else {
            console.log('✅ Columnas GPS agregadas correctamente')
        }

        // 5. Verificar ubicación de prueba
        console.log('\n📋 5. Verificando ubicación de prueba...')
        const { data: ubicPrueba, error: e5 } = await supabase
            .from('ubicaciones_barberia')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single()

        if (e5) {
            console.log('⚠️  Ubicación de prueba no encontrada')
        } else {
            console.log('✅ Ubicación de prueba existe:')
            console.log(`   ID: ${ubicPrueba.id}`)
            console.log(`   Nombre: ${ubicPrueba.nombre}`)
            console.log(`   Coords: ${ubicPrueba.latitud}, ${ubicPrueba.longitud}`)
            console.log(`   Radio: ${ubicPrueba.radio_permitido}m`)
        }

    } catch (error) {
        console.error('\n❌ Error general:', error.message)
        todoBien = false
    }

    console.log('\n' + '='.repeat(60))

    if (todoBien) {
        console.log('\n✅ ¡TODO ESTÁ CONFIGURADO CORRECTAMENTE!')
        console.log('\n📝 Próximos pasos:')
        console.log('1. Ve al Panel Admin → "Ubicaciones GPS"')
        console.log('2. Captura la ubicación REAL de tu barbería')
        console.log('3. Actualiza MarcarAsistencia.tsx con el ID correcto')
        console.log('4. Genera la primera clave del día')
        console.log('5. ¡Prueba el sistema!')
    } else {
        console.log('\n⚠️  Hay algunos problemas. Revisa los errores arriba.')
    }
}

verificarSistema()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
