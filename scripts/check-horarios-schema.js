// Script para verificar el schema de las tablas de horarios
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando tablas de horarios en Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable(tableName) {
  console.log(`\n📋 Tabla: ${tableName}`)
  console.log('='.repeat(60))
  
  try {
    // Obtener estructura de la tabla
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.error(`❌ Error: ${error.message}`)
      return
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log(`✅ Columnas (${columns.length}):`, columns)
      console.log('\n📊 Ejemplo de registro:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('⚠️  Tabla existe pero está vacía')
      // Intentar obtener columnas de otra forma
      const { data: emptyData, error: emptyError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)
      
      if (!emptyError) {
        console.log('📝 Tabla válida y accesible')
      }
    }
    
    // Contar registros
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (!countError) {
      console.log(`\n🔢 Total de registros: ${count}`)
    }
    
  } catch (error) {
    console.error(`❌ Error inesperado: ${error.message}`)
  }
}

async function main() {
  console.log('📍 Supabase URL:', supabaseUrl)
  console.log('🔑 Usando:', supabaseKey ? 'Service Role Key' : 'Anon Key')
  
  await checkTable('horarios_atencion')
  await checkTable('horarios_bloqueados')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Verificación completada\n')
}

main()
