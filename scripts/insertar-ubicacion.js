// Script para verificar y crear tabla ubicaciones_barberia
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verificarYCrearTabla() {
    console.log('🔵 Conectando a Supabase...')

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    })

    try {
        // Primero intentar leer la tabla
        console.log('\n🔎 Verificando si existe la tabla ubicaciones_barberia...')
        const { data: test, error: testError } = await supabase
            .from('ubicaciones_barberia')
            .select('count')
            .limit(1)

        if (testError) {
            console.log('❌ La tabla no existe:', testError.message)
            console.log('\n⚠️ ACCIÓN REQUERIDA:')
            console.log('Debes ejecutar los siguientes scripts SQL en Supabase SQL Editor:')
            console.log('1. sql/asistencia_schema.sql')
            console.log('2. sql/geolocalizacion_schema.sql')
            console.log('\nPara hacerlo:')
            console.log('- Ve a https://supabase.com/dashboard')
            console.log('- Abre tu proyecto')
            console.log('- SQL Editor → New Query')
            console.log('- Copia y pega cada script')
            console.log('- Click en "Run"')
            process.exit(1)
        }

        console.log('✅ La tabla existe')

        // Ahora intentar insertar
        console.log('\n📝 Insertando ubicación de prueba...')
        const { data, error } = await supabase
            .from('ubicaciones_barberia')
            .upsert({
                id: '00000000-0000-0000-0000-000000000001',
                nombre: 'Chamos Barber - Principal',
                latitud: -33.437916,
                longitud: -70.650410,
                radio_permitido: 100,
                activa: true
            }, {
                onConflict: 'id'
            })
            .select()

        if (error) {
            console.error('❌ Error al insertar:', error)
            console.error('\nDetalles del error:')
            console.error('- Código:', error.code)
            console.error('- Mensaje:', error.message)
            console.error('- Detalles:', error.details)
            console.error('- Hint:', error.hint)
            throw error
        }

        console.log('\n✅ ¡Ubicación insertada exitosamente!')
        console.log('📍 ID: 00000000-0000-0000-0000-000000000001')
        console.log('📍 Nombre: Chamos Barber - Principal')
        console.log('📍 Coordenadas: -33.437916, -70.650410')
        console.log('📍 Radio: 100 metros')

    } catch (error) {
        console.error('\n❌ Error:', error.message || error)
        process.exit(1)
    }
}

verificarYCrearTabla()
    .then(() => {
        console.log('\n\n✅ ¡Todo listo!')
        console.log('\n📝 Próximos pasos:')
        console.log('1. Admin → Panel Admin → "Ubicaciones GPS"')
        console.log('2. Capturar ubicación REAL en la barbería')
        console.log('3. Guardar y copiar el ID')
        console.log('4. Actualizar MarcarAsistencia.tsx con el ID')
        process.exit(0)
    })
    .catch(() => {
        process.exit(1)
    })
