require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkHorariosTrabajo() {
  console.log('🔍 Checking horarios_trabajo table...\n')
  
  try {
    const { data, error } = await supabase
      .from('horarios_trabajo')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Error:', error.message)
      if (error.message.includes('does not exist')) {
        console.log('\n⚠️  La tabla horarios_trabajo NO EXISTE en la base de datos')
      }
      return
    }
    
    console.log('✅ La tabla horarios_trabajo EXISTE')
    console.log(`📊 Registros encontrados: ${data?.length || 0}`)
    if (data && data.length > 0) {
      console.log('\n📝 Ejemplo:', JSON.stringify(data[0], null, 2))
    }
  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

checkHorariosTrabajo()
