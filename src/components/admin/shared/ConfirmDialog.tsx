import React from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false
}) => {
  if (!isOpen) return null

  const typeColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  }

  const typeIcons = {
    danger: 'fa-exclamation-triangle text-red-600',
    warning: 'fa-exclamation-circle text-yellow-600',
    info: 'fa-info-circle text-blue-600'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 transition-opacity"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={onClose}
        />
        
        <div 
          className="relative rounded-lg shadow-xl w-full max-w-md"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <i className={`fas ${typeIcons[type]} text-3xl`}></i>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  {message}
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className="px-6 py-4 flex gap-3 justify-end rounded-b-lg"
            style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}
          >
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50"
              style={{ 
                color: 'var(--text-primary)', 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-md ${typeColors[type]} disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && <i className="fas fa-spinner fa-spin"></i>}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
