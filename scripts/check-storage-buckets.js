// Script para verificar los buckets de Storage en Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando buckets de Storage en Supabase...\n')
console.log('📍 Supabase URL:', supabaseUrl)
console.log('🔑 Usando:', supabaseKey ? (supabaseKey.startsWith('eyJ') ? 'Service Role Key' : 'Anon Key') : 'NO KEY')
console.log('')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorageBuckets() {
  try {
    // Listar todos los buckets
    console.log('📦 Listando buckets existentes...')
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Error listando buckets:', error)
      return
    }

    if (!buckets || buckets.length === 0) {
      console.log('⚠️ No se encontraron buckets en Storage')
      console.log('')
      console.log('📋 BUCKETS NECESARIOS:')
      console.log('  - barberos-fotos (para fotos de barberos)')
      console.log('  - servicios-fotos (para fotos de servicios)')
      console.log('')
      console.log('🔧 Para crear los buckets, ejecuta:')
      console.log('   node scripts/create-storage-buckets.js')
      return
    }

    console.log(`✅ Se encontraron ${buckets.length} bucket(s):\n`)
    buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.name}`)
      console.log(`   - ID: ${bucket.id}`)
      console.log(`   - Público: ${bucket.public ? 'Sí' : 'No'}`)
      console.log(`   - Creado: ${bucket.created_at}`)
      console.log('')
    })

    // Verificar buckets específicos
    const requiredBuckets = ['barberos-fotos', 'servicios-fotos']
    const existingBucketNames = buckets.map(b => b.name)
    
    console.log('🔍 Verificando buckets requeridos:')
    requiredBuckets.forEach(bucketName => {
      const exists = existingBucketNames.includes(bucketName)
      console.log(`  ${exists ? '✅' : '❌'} ${bucketName}: ${exists ? 'EXISTE' : 'NO EXISTE'}`)
    })

    const missingBuckets = requiredBuckets.filter(b => !existingBucketNames.includes(b))
    
    if (missingBuckets.length > 0) {
      console.log('')
      console.log('⚠️ Buckets faltantes:', missingBuckets.join(', '))
      console.log('')
      console.log('🔧 Para crear los buckets faltantes, ejecuta:')
      console.log('   node scripts/create-storage-buckets.js')
    } else {
      console.log('')
      console.log('✅ Todos los buckets necesarios existen')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkStorageBuckets()
