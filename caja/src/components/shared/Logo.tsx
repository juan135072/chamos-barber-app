import React from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withText?: boolean
  href?: string
  className?: string
}

const sizeClasses = {
  sm: { img: 'h-8', text: 'text-lg' },
  md: { img: 'h-12', text: 'text-xl' },
  lg: { img: 'h-16', text: 'text-2xl' },
  xl: { img: 'h-24', text: 'text-4xl' }
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  withText = true, 
  href,
  className = '' 
}) => {
  const sizes = sizeClasses[size]
  
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/chamos-logo.png" 
        alt="Chamos Barber Logo" 
        className={`${sizes.img} object-contain`}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />
      {withText && (
        <div className="flex flex-col">
          <span 
            className={`${sizes.text} font-bold leading-tight`}
            style={{ color: 'var(--accent-color)' }}
          >
            CHAMOS
          </span>
          <span 
            className="text-xs font-medium tracking-wider"
            style={{ 
              color: 'var(--text-primary)',
              opacity: 0.7,
              marginTop: '-2px'
            }}
          >
            BARBER
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <a className="transition-opacity hover:opacity-80">
          {logoContent}
        </a>
      </Link>
    )
  }

  return logoContent
}

export default Logo
