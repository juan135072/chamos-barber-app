import React, { useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import toast from 'react-hot-toast'

const ChangePasswordSection: React.FC = () => {
  const session = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Todos los campos son requeridos')
      return
    }

    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando contraseña')
      }

      toast.success('¡Contraseña cambiada exitosamente!')
      
      // Limpiar formulario
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: '', color: '', width: '0%' }
    if (password.length < 8) return { strength: 'Débil', color: '#ef4444', width: '33%' }
    
    let score = 0
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    if (score <= 2) return { strength: 'Débil', color: '#ef4444', width: '33%' }
    if (score <= 4) return { strength: 'Media', color: '#eab308', width: '66%' }
    return { strength: 'Fuerte', color: '#22c55e', width: '100%' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto',
      background: 'var(--bg-secondary)',
      padding: '2rem',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)'
    }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>
        <i className="fas fa-key"></i> Cambiar Contraseña
      </h2>
      
      <p style={{ 
        marginBottom: '2rem', 
        color: 'var(--text-primary)', 
        opacity: 0.8,
        fontSize: '0.95rem'
      }}>
        Por seguridad, te recomendamos usar una contraseña fuerte con al menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Contraseña Actual */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            Contraseña Actual
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '0.75rem 3rem 0.75rem 1rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
              placeholder="Ingresa tu contraseña actual"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                opacity: 0.6,
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.25rem'
              }}
              title={showCurrentPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        {/* Nueva Contraseña */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            Nueva Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '0.75rem 3rem 0.75rem 1rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                opacity: 0.6,
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.25rem'
              }}
              title={showNewPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          
          {/* Indicador de fortaleza */}
          {newPassword && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ 
                height: '4px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  width: passwordStrength.width,
                  background: passwordStrength.color,
                  transition: 'all 0.3s'
                }}></div>
              </div>
              <p style={{ 
                fontSize: '0.85rem', 
                marginTop: '0.25rem',
                color: passwordStrength.color
              }}>
                Fortaleza: {passwordStrength.strength}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar Nueva Contraseña */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            Confirmar Nueva Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '0.75rem 3rem 0.75rem 1rem',
                background: 'var(--bg-primary)',
                border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? '#ef4444' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
              placeholder="Repite la nueva contraseña"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                opacity: 0.6,
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.25rem'
              }}
              title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.25rem' }}>
              <i className="fas fa-exclamation-circle"></i> Las contraseñas no coinciden
            </p>
          )}
        </div>

        {/* Info Box */}
        <div style={{
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--border-radius)',
          marginBottom: '1.5rem'
        }}>
          <p style={{ fontSize: '0.85rem', color: '#60a5fa', margin: 0, lineHeight: 1.5 }}>
            <i className="fas fa-info-circle"></i> <strong>Consejos para una contraseña segura:</strong>
            <br />
            • Usa al menos 12 caracteres
            <br />
            • Combina mayúsculas, minúsculas, números y símbolos
            <br />
            • Evita información personal o palabras comunes
          </p>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              setCurrentPassword('')
              setNewPassword('')
              setConfirmPassword('')
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent-color)',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              color: '#000',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Cambiando...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i> Cambiar Contraseña
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChangePasswordSection
