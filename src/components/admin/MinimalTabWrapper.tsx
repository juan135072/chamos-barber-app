import React from 'react'

interface MinimalTabWrapperProps {
  children: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

const MinimalTabWrapper: React.FC<MinimalTabWrapperProps> = ({ 
  children, 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="fade-in">
      {(title || description || action) && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-minimal-h2 mb-1">{title}</h2>
            )}
            {description && (
              <p className="text-minimal-body">{description}</p>
            )}
          </div>
          {action && (
            <div>{action}</div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export default MinimalTabWrapper
