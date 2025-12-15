import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'

export default function EmergencyAdminReset() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const resetAdminPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('❌ La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setMessage('⏳ Reseteando contraseña...')

    try {
      // Usar el Service Role Key para actualizar directamente
      const { data, error } = await supabase.auth.admin.updateUserById(
        '4ce7e112-12a7-4909-b922-59fa1fdafc0b', // UUID del admin
        { password: newPassword }
      )

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
        console.error('Error:', error)
      } else {
        setMessage(`✅ ¡Contraseña actualizada exitosamente!

Email: contacto@chamosbarber.com
Nueva contraseña: ${newPassword}

Ahora puedes hacer login en /login

⚠️ IMPORTANTE: Por seguridad, elimina este archivo después de usarlo.`)
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Emergency Password Reset - Chamos Barber</title>
      </Head>
      
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '40px', 
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{ 
            color: '#D4AF37', 
            marginBottom: '10px',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            🔐 Reset Password - Emergencia
          </h1>
          
          <p style={{ 
            color: '#999', 
            fontSize: '14px',
            marginBottom: '30px'
          }}>
            Página temporal para resetear contraseña de admin
          </p>

          <div style={{
            backgroundColor: '#1a1a2a',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#ccc', margin: 0, fontSize: '14px' }}>
              <strong>Usuario:</strong> contacto@chamosbarber.com
            </p>
            <p style={{ color: '#999', margin: '5px 0 0 0', fontSize: '12px' }}>
              UUID: 4ce7e112-12a7-4909-b922-59fa1fdafc0b
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              color: '#ccc', 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Nueva Contraseña:
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres (ej: ChamosAdmin2024!)"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#D4AF37'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
            />
            <p style={{ 
              color: '#999', 
              fontSize: '12px',
              marginTop: '5px',
              marginBottom: 0
            }}>
              * La contraseña se mostrará en texto plano para que puedas copiarla
            </p>
          </div>

          <button
            onClick={resetAdminPassword}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              backgroundColor: loading ? '#666' : '#D4AF37',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#B8941F'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#D4AF37'
            }}
          >
            {loading ? '⏳ Reseteando...' : '🔑 Resetear Contraseña'}
          </button>

          {message && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: message.includes('✅') ? '#1a4d1a' : '#4d1a1a',
              border: `2px solid ${message.includes('✅') ? '#2d7d2d' : '#7d2d2d'}`,
              borderRadius: '6px',
              color: '#fff',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {message}
            </div>
          )}

          <div style={{ 
            marginTop: '30px', 
            padding: '15px', 
            backgroundColor: '#2a1a1a', 
            borderRadius: '6px',
            border: '1px solid #7d2d2d'
          }}>
            <p style={{ 
              color: '#ff6b6b', 
              fontSize: '13px', 
              margin: 0,
              lineHeight: '1.6'
            }}>
              <strong>⚠️ IMPORTANTE - SEGURIDAD:</strong>
              <br />
              Esta página es temporal solo para emergencias.
              <br />
              <strong>Después de resetear tu contraseña, ELIMINA este archivo:</strong>
              <br />
              <code style={{ 
                backgroundColor: '#1a1a1a', 
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                rm src/pages/admin-reset-emergency.tsx
              </code>
            </p>
          </div>

          <div style={{ 
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <a 
              href="/login"
              style={{
                color: '#D4AF37',
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              ← Volver al Login
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
