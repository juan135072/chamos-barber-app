import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '../../lib/initSupabase'
import { Toaster } from 'react-hot-toast'
import OneSignalProvider from '../components/providers/OneSignalProvider'
import OneSignalDebugPanel from '../components/debug/OneSignalDebugPanel'
import OneSignalTestButton from '../components/debug/OneSignalTestButton'
import WhatsAppButton from '../components/WhatsAppButton'
import '../styles/globals.css'
import '../styles/admin-minimal.css'

export default function App({ Component, pageProps }: AppProps) {
  // Nota: OneSignal manejará su propio service worker (OneSignalSDKWorker.js)
  // No registramos sw.js aquí para evitar conflictos con PWA convencionales

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <OneSignalProvider autoPrompt={false}>
        <Head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" type="image/x-icon" href="/favicon.ico" />

          {/* Font Awesome */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
          />

          {/* Google Fonts */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#d97706',
                secondary: '#fff',
              },
            },
          }}
        />
        {/* Componentes de debug de OneSignal (solo en desarrollo) */}
        <OneSignalTestButton />
        <OneSignalDebugPanel />
        <WhatsAppButton />
      </OneSignalProvider>
    </SessionContextProvider>
  )
}
