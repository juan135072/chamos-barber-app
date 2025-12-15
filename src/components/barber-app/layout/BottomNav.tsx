// ================================================================
// 📱 COMPONENTE: BottomNav
// Navegación inferior fija con 3 opciones principales
// ================================================================

import React from 'react'
import Link from 'next/link'
import { Calendar, User, History } from 'lucide-react'
import { BottomNavProps } from '../../../types/barber-app'

export default function BottomNav({ currentPage }: BottomNavProps) {
  const navItems = [
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      href: '/barber-app'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      href: '/barber-app/profile'
    },
    {
      id: 'history',
      label: 'Historial',
      icon: History,
      href: '/barber-app/history'
    }
  ]

  return (
    <>
      <nav className="bottom-nav">
        <div className="nav-content">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <Link key={item.id} href={item.href} legacyBehavior>
                <a className={`nav-item ${isActive ? 'active' : ''}`}>
                  <div className="icon-wrapper">
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && <div className="active-indicator" />}
                  </div>
                  <span className="nav-label">{item.label}</span>
                </a>
              </Link>
            )
          })}
        </div>
      </nav>

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(70px + env(safe-area-inset-bottom));
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid rgba(212, 175, 55, 0.2);
          z-index: 100;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .nav-content {
          height: 70px;
          max-width: 600px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding: 0 1rem;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          padding: 0.5rem;
          border-radius: 12px;
        }

        .nav-item:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          color: #D4AF37;
        }

        .icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }

        .active-indicator {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 3px;
          background: linear-gradient(90deg, #D4AF37 0%, #F4D03F 100%);
          border-radius: 3px 3px 0 0;
          animation: slideIn 0.3s ease;
        }

        .nav-label {
          font-size: 0.688rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .nav-item.active .nav-label {
          font-weight: 700;
        }

        @keyframes slideIn {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 32px;
            opacity: 1;
          }
        }

        /* Efecto de ripple */
        .nav-item::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.4s, height 0.4s;
        }

        .nav-item:active::before {
          width: 80px;
          height: 80px;
        }

        @media (max-width: 360px) {
          .nav-item {
            padding: 0.25rem;
          }

          .icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .nav-item :global(svg) {
            width: 20px;
            height: 20px;
          }

          .nav-label {
            font-size: 0.625rem;
          }
        }

        /* Mejor contraste en modo oscuro */
        @media (prefers-color-scheme: dark) {
          .bottom-nav {
            background: rgba(10, 10, 10, 0.98);
          }
        }
      `}</style>
    </>
  )
}
