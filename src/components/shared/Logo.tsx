import React from 'react'
import Link from 'next/link'
import { useTenant } from '@/context/TenantContext'

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
  const { tenant } = useTenant()
  
  const defaultNombre = tenant?.nombre || 'CHAMOS'
  
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      {tenant?.favicon_url || tenant?.logo_url ? (
        <img 
          src={tenant?.favicon_url || tenant?.logo_url || '/chamos-icon-gold.png'} 
          alt={`${defaultNombre} Logo`} 
          className={`${sizes.img} object-contain`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
      ) : (
        <div className={`${sizes.img} aspect-square rounded-full flex items-center justify-center border`} style={{ borderColor: 'var(--tenant-primary, var(--accent-color))', background: 'rgba(0,0,0,0.5)' }}>
          <span className={`${sizes.text} font-bold`} style={{ color: 'var(--tenant-primary, var(--accent-color))' }}>
            {defaultNombre.charAt(0)}
          </span>
        </div>
      )}
      {withText && (
        <div className="flex flex-col">
          <span 
            className={`${sizes.text} font-bold leading-tight uppercase`}
            style={{ color: 'var(--tenant-primary, var(--accent-color))' }}
          >
            {defaultNombre}
          </span>
          <span 
            className="text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ 
              color: 'var(--text-primary)',
              opacity: 0.5,
              marginTop: '-4px'
            }}
          >
            PANEL DE CONTROL
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
