import React, { useState } from 'react'
import Modal from '../shared/Modal'

interface PermanentDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  barberoNombre: string
  loading: boolean
}

const PermanentDeleteModal: React.FC<PermanentDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  barberoNombre,
  loading
}) => {
  const [step, setStep] = useState<'education' | 'confirmation'>('education')
  const [understood, setUnderstood] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleClose = () => {
    if (!loading) {
      setStep('education')
      setUnderstood(false)
      setConfirmText('')
      onClose()
    }
  }

  const handleEducationNext = () => {
    if (understood) {
      setStep('confirmation')
    }
  }

  const handleConfirm = async () => {
    if (confirmText.toUpperCase() === 'ELIMINAR PERMANENTEMENTE') {
      await onConfirm()
      handleClose()
    }
  }

  const isConfirmationValid = confirmText.toUpperCase() === 'ELIMINAR PERMANENTEMENTE'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        {step === 'education' ? (
          <>
            {/* Educational Step */}
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full p-3 bg-yellow-100">
                <i className="fas fa-exclamation-triangle text-yellow-600 text-3xl"></i>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
              ⚠️ Antes de Eliminar Permanentemente
            </h2>

            <div className="space-y-6 mb-6">
              {/* Sección 1: Preservar Historial */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="fas fa-history text-2xl mr-3" style={{ color: 'var(--accent-color)' }}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      1. Preservar Historial
                    </h3>
                    <ul className="space-y-1 text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>Si el barbero tiene <strong>citas pasadas</strong>, necesitas mantener el registro</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>Los <strong>clientes</strong> pueden querer ver quién les atendió</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span><strong>Reportes y estadísticas</strong> necesitan la información histórica</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sección 2: Posibilidad de Reactivar */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="fas fa-undo text-2xl mr-3" style={{ color: 'var(--accent-color)' }}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      2. Posibilidad de Reactivar
                    </h3>
                    <ul className="space-y-1 text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>Si fue un <strong>error</strong>, puedes reactivar al barbero fácilmente</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>No pierdes toda su <strong>información y configuración</strong></span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>El barbero puede volver sin necesidad de <strong>crear todo desde cero</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sección 3: Auditoría */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="fas fa-file-contract text-2xl mr-3" style={{ color: 'var(--accent-color)' }}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      3. Auditoría y Cumplimiento Legal
                    </h3>
                    <ul className="space-y-1 text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span>Mantener <strong>registro de quién trabajó</strong> en el negocio</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span><strong>Cumplimiento legal y contable</strong> requiere historial completo</span>
                      </li>
                      <li className="flex items-start">
                        <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                        <span><strong>Trazabilidad</strong> para auditorías internas o externas</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recomendación */}
              <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                <div className="flex items-start">
                  <i className="fas fa-lightbulb text-blue-600 text-xl mr-3 mt-1"></i>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      💡 Recomendación
                    </p>
                    <p className="text-sm text-blue-800">
                      En lugar de eliminar permanentemente, considera usar el botón de <strong>"Inactivo"</strong> en la tabla. 
                      Esto desactiva al barbero sin perder datos importantes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox de entendimiento */}
            <div className="mb-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-1 mr-3"
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  He leído y comprendido las razones para <strong>NO eliminar permanentemente</strong>. 
                  Entiendo que desactivar es la mejor opción en la mayoría de casos.
                </span>
              </label>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEducationNext}
                disabled={!understood}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ 
                  backgroundColor: understood ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  cursor: understood ? 'pointer' : 'not-allowed',
                  opacity: understood ? 1 : 0.6
                }}
              >
                Continuar de Todas Formas
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full p-3 bg-red-100">
                <i className="fas fa-skull-crossbones text-red-600 text-3xl"></i>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-4 text-red-600">
              ⛔ Eliminación Permanente
            </h2>

            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm text-red-900 mb-3">
                <strong>ADVERTENCIA:</strong> Esta acción es <strong>IRREVERSIBLE</strong>. 
                Se eliminará permanentemente:
              </p>
              <ul className="space-y-1 text-sm text-red-800">
                <li className="flex items-start">
                  <i className="fas fa-times text-red-600 mr-2 mt-1"></i>
                  <span>Todos los datos de <strong>{barberoNombre}</strong></span>
                </li>
                <li className="flex items-start">
                  <i className="fas fa-times text-red-600 mr-2 mt-1"></i>
                  <span>Su cuenta de acceso al sistema</span>
                </li>
                <li className="flex items-start">
                  <i className="fas fa-times text-red-600 mr-2 mt-1"></i>
                  <span>NO podrá ser recuperado</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                Para confirmar, escribe exactamente: <strong className="text-red-600">ELIMINAR PERMANENTEMENTE</strong>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe aquí..."
                disabled={loading}
                className="w-full px-4 py-2 rounded-md text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border-color)'
                }}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isConfirmationValid || loading}
                className="px-4 py-2 rounded-md text-sm font-medium flex items-center"
                style={{ 
                  backgroundColor: isConfirmationValid && !loading ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  cursor: isConfirmationValid && !loading ? 'pointer' : 'not-allowed',
                  opacity: isConfirmationValid && !loading ? 1 : 0.6
                }}
              >
                {loading && <i className="fas fa-spinner fa-spin mr-2"></i>}
                Eliminar Permanentemente
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default PermanentDeleteModal
