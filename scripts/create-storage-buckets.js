// Script para crear los buckets de Storage faltantes en Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Creando buckets de Storage en Supabase...\n')
console.log('📍 Supabase URL:', supabaseUrl)
console.log('🔑 Usando Service Role Key:', supabaseKey ? 'Sí' : 'NO')
console.log('')

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
  console.error('❌ ERROR: Se requiere SUPABASE_SERVICE_ROLE_KEY para crear buckets')
  console.error('   La ANON KEY no tiene permisos suficientes.')
  console.error('')
  console.error('📋 SOLUCIÓN ALTERNATIVA:')
  console.error('   Ve al Dashboard de Supabase:')
  console.error('   1. https://supabase.chamosbarber.com')
  console.error('   2. Storage -> Create new bucket')
  console.error('   3. Nombre: "servicios-fotos"')
  console.error('   4. Public bucket: YES')
  console.error('   5. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif')
  console.error('   6. Max file size: 5MB')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBucket(bucketName) {
  try {
    console.log(`📦 Creando bucket: ${bucketName}...`)

    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
    })

    if (error) {
      // Si el error es que ya existe, no es grave
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log(`⚠️  Bucket "${bucketName}" ya existe (ok)`)
        return { success: true, exists: true }
      }
      
      console.error(`❌ Error creando bucket "${bucketName}":`, error)
      return { success: false, error }
    }

    console.log(`✅ Bucket "${bucketName}" creado exitosamente`)
    return { success: true, data }
  } catch (error) {
    console.error(`❌ Error inesperado con "${bucketName}":`, error.message)
    return { success: false, error }
  }
}

async function main() {
  const requiredBuckets = [
    {
      name: 'barberos-fotos',
      description: 'Fotos de perfil de barberos'
    },
    {
      name: 'servicios-fotos',
      description: 'Fotos de servicios ofrecidos'
    }
  ]

  console.log('📋 Buckets a verificar/crear:')
  requiredBuckets.forEach((bucket, i) => {
    console.log(`  ${i + 1}. ${bucket.name} - ${bucket.description}`)
  })
  console.log('')

  let created = 0
  let existed = 0
  let failed = 0

  for (const bucket of requiredBuckets) {
    const result = await createBucket(bucket.name)
    
    if (result.success) {
      if (result.exists) {
        existed++
      } else {
        created++
      }
    } else {
      failed++
    }
    
    console.log('') // Línea en blanco entre buckets
  }

  console.log('📊 RESUMEN:')
  console.log(`  ✅ Creados: ${created}`)
  console.log(`  ⚠️  Ya existían: ${existed}`)
  console.log(`  ❌ Fallidos: ${failed}`)
  console.log('')

  if (created > 0 || existed > 0) {
    console.log('✅ Los buckets están listos para usar')
    console.log('')
    console.log('🔄 Próximos pasos:')
    console.log('  1. Reinicia la aplicación si está corriendo')
    console.log('  2. Intenta subir una imagen de servicio nuevamente')
    console.log('  3. La subida debería funcionar correctamente')
  }

  if (failed > 0) {
    console.log('')
    console.log('⚠️  Algunos buckets no se pudieron crear automáticamente.')
    console.log('   Deberás crearlos manualmente en el Dashboard de Supabase.')
    console.log('')
    console.log('📋 INSTRUCCIONES PARA CREAR MANUALMENTE:')
    console.log('   1. Ve a: https://supabase.chamosbarber.com')
    console.log('   2. Storage -> Create new bucket')
    console.log('   3. Nombre: "servicios-fotos"')
    console.log('   4. Public bucket: YES ✅')
    console.log('   5. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif')
    console.log('   6. Max file size: 5MB (5242880 bytes)')
    console.log('   7. Click "Create bucket"')
  }
}

main()
