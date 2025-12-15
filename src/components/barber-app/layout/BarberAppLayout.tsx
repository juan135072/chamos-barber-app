// ================================================================
// 📱 COMPONENTE: BarberAppLayout
// Layout principal de la Barber App con navbar inferior fija
// ================================================================

import React from 'react'
import Head from 'next/head'
import { BarberAppLayoutProps } from '../../../types/barber-app'
import BottomNav from './BottomNav'
import Header from './Header'

export default function BarberAppLayout({ children, barbero, currentPage }: BarberAppLayoutProps) {
  return (
    <>
      <Head>
        <title>Barber App - Chamos Barber</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>

      <div className="barber-app-container">
        {/* Header con información del barbero */}
        <Header barbero={barbero} />

        {/* Contenido principal con scroll */}
        <main className="barber-app-main">
          {children}
        </main>

        {/* Navegación inferior fija */}
        <BottomNav currentPage={currentPage} />
      </div>

      <style jsx>{`
        .barber-app-container {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .barber-app-main {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 1rem;
          padding-top: calc(70px + 1rem); /* Altura del header + padding */
          padding-bottom: calc(70px + 1rem); /* Altura del bottom nav + padding */
          max-width: 100%;
        }

        /* Scrollbar personalizado para WebKit */
        .barber-app-main::-webkit-scrollbar {
          width: 4px;
        }

        .barber-app-main::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .barber-app-main::-webkit-scrollbar-thumb {
          background: #D4AF37;
          border-radius: 2px;
        }

        /* Estilos globales para la app */
        :global(.barber-app-container *) {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        /* Deshabilitar selección de texto en toda la app */
        :global(.barber-app-container) {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Habilitar selección solo en inputs y áreas de texto */
        :global(.barber-app-container input),
        :global(.barber-app-container textarea) {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }

        /* Media query para dispositivos muy pequeños */
        @media (max-width: 360px) {
          .barber-app-main {
            padding: 0.75rem;
            padding-top: calc(70px + 0.75rem);
            padding-bottom: calc(70px + 0.75rem);
          }
        }

        /* Media query para dispositivos con notch */
        @supports (padding: max(0px)) {
          .barber-app-main {
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
          }
        }
      `}</style>
    </>
  )
}
