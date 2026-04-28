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
    <div className="max-w-2xl mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl mt-4">
      <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
        <i className="fas fa-key text-gold"></i> Cambiar Contraseña
      </h2>
      
      <p className="text-white/60 text-sm mb-8">
        Por seguridad, te recomendamos usar una contraseña fuerte con al menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contraseña Actual */}
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
            Contraseña Actual
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors pr-12"
              placeholder="Ingresa tu contraseña actual"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              title={showCurrentPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        {/* Nueva Contraseña */}
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
            Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors pr-12"
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              title={showNewPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          
          {/* Indicador de fortaleza */}
          {newPassword && (
            <div className="mt-3">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: passwordStrength.width,
                    backgroundColor: passwordStrength.color
                  }}
                ></div>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: passwordStrength.color }}>
                Fortaleza: {passwordStrength.strength}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar Nueva Contraseña */}
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
            Confirmar Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 bg-[#0a0a0a] border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors pr-12 ${
                confirmPassword && newPassword !== confirmPassword 
                  ? 'border-red-500/50 focus:border-red-500' 
                  : 'border-white/10 focus:border-gold'
              }`}
              placeholder="Repite la nueva contraseña"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400 mt-2 font-bold flex items-center gap-1">
              <i className="fas fa-exclamation-circle"></i> Las contraseñas no coinciden
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400">
          <p className="font-bold flex items-center gap-2 mb-2">
            <i className="fas fa-info-circle"></i> Consejos para una contraseña segura:
          </p>
          <ul className="space-y-1 pl-6 list-disc opacity-80">
            <li>Usa al menos 12 caracteres</li>
            <li>Combina mayúsculas, minúsculas, números y símbolos</li>
            <li>Evita información personal o palabras comunes</li>
          </ul>
        </div>

        {/* Botones */}
        <div className="flex gap-4 justify-end pt-4">
          <button
            type="button"
            onClick={() => {
              setCurrentPassword('')
              setNewPassword('')
              setConfirmPassword('')
            }}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-sm transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="relative group inline-flex overflow-hidden rounded-xl bg-gold/20 p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative bg-gradient-to-br from-gold to-[#a88647] px-6 py-3 rounded-xl transition-all duration-300 group-hover:brightness-110 flex items-center justify-center gap-2">
              {loading ? (
                <><i className="fas fa-circle-notch fa-spin text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider text-sm">Cambiando...</span></>
              ) : (
                <><i className="fas fa-check text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider text-sm">Cambiar Contraseña</span></>
              )}
            </div>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChangePasswordSection
