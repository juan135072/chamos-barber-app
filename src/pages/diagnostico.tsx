import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/initSupabase'

export default function DiagnosticoPage() {
  const [diagnostico, setDiagnostico] = useState<any>({
    loading: true,
    supabaseUrl: '',
    supabaseKeyPresent: false,
    connectionTest: null,
    authTest: null
  })

  useEffect(() => {
    runDiagnostico()
  }, [])

  const runDiagnostico = async () => {
    const results: any = {
      loading: false,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO CONFIGURADO',
      supabaseKeyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      connectionTest: null,
      authTest: null,
      timestamp: new Date().toISOString()
    }

    // Test 1: Connection
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('id')
        .limit(1)
      
      if (error) {
        results.connectionTest = { success: false, error: error.message }
      } else {
        results.connectionTest = { success: true, data }
      }
    } catch (error: any) {
      results.connectionTest = { success: false, error: error.message }
    }

    // Test 2: Auth endpoint
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
        method: 'GET'
      })
      results.authTest = { 
        success: response.ok, 
        status: response.status,
        statusText: response.statusText
      }
    } catch (error: any) {
      results.authTest = { success: false, error: error.message }
    }

    setDiagnostico(results)
  }

  if (diagnostico.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Diagnóstico - Chamos Barber</title>
      </Head>

      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              🔍 Diagnóstico del Sistema
            </h1>

            {/* Supabase URL */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">📡 URL de Supabase</h3>
              <p className="text-sm font-mono bg-gray-800 text-white p-2 rounded">
                {diagnostico.supabaseUrl}
              </p>
            </div>

            {/* Anon Key */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🔑 Anon Key</h3>
              <div className={`flex items-center ${diagnostico.supabaseKeyPresent ? 'text-green-600' : 'text-red-600'}`}>
                <i className={`fas ${diagnostico.supabaseKeyPresent ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                {diagnostico.supabaseKeyPresent ? 'Configurado' : 'NO CONFIGURADO'}
              </div>
            </div>

            {/* Connection Test */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🌐 Test de Conexión (Database)</h3>
              {diagnostico.connectionTest?.success ? (
                <div className="text-green-600">
                  <i className="fas fa-check-circle mr-2"></i>
                  Conexión exitosa
                  <pre className="mt-2 text-xs bg-gray-800 text-white p-2 rounded overflow-auto">
                    {JSON.stringify(diagnostico.connectionTest.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-red-600">
                  <i className="fas fa-times-circle mr-2"></i>
                  Error de conexión
                  <p className="mt-2 text-sm bg-red-50 text-red-800 p-2 rounded">
                    {diagnostico.connectionTest?.error || 'Error desconocido'}
                  </p>
                </div>
              )}
            </div>

            {/* Auth Test */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🔐 Test de Auth Endpoint</h3>
              {diagnostico.authTest?.success ? (
                <div className="text-green-600">
                  <i className="fas fa-check-circle mr-2"></i>
                  Auth endpoint accesible (Status: {diagnostico.authTest.status})
                </div>
              ) : (
                <div className="text-red-600">
                  <i className="fas fa-times-circle mr-2"></i>
                  Auth endpoint no accesible
                  <p className="mt-2 text-sm bg-red-50 text-red-800 p-2 rounded">
                    {diagnostico.authTest?.error || `Status: ${diagnostico.authTest?.status} - ${diagnostico.authTest?.statusText}`}
                  </p>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-sm text-gray-500 mt-8 pt-4 border-t">
              <p>Última actualización: {new Date(diagnostico.timestamp).toLocaleString('es-ES')}</p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={runDiagnostico}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
              >
                🔄 Volver a probar
              </button>
              <a
                href="/login"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ← Volver a Login
              </a>
            </div>

            {/* Recomendaciones */}
            {!diagnostico.connectionTest?.success && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Recomendaciones:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  <li>Verifica que Supabase esté corriendo: {diagnostico.supabaseUrl}</li>
                  <li>Verifica que las variables de entorno estén configuradas en Coolify</li>
                  <li>Verifica que el re-deploy se haya completado exitosamente</li>
                  <li>Intenta acceder directamente a: {diagnostico.supabaseUrl}/rest/v1/</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
