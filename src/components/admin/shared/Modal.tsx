import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showHeader?: boolean
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', showHeader = true }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={onClose}
        />
        
        {/* Modal */}
        <div 
          className={`relative rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)' 
          }}
        >
          {/* Header */}
          {showHeader && title && (
            <div 
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <h3 
                className="text-xl font-semibold"
                style={{ color: 'var(--accent-color)' }}
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="transition-colors"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className={showHeader && title ? "p-6" : ""}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
