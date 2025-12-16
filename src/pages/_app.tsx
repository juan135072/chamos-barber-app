import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '../../lib/initSupabase'
import { Toaster } from 'react-hot-toast'
import OneSignalProvider from '../components/providers/OneSignalProvider'
import OneSignalDebugPanel from '../components/debug/OneSignalDebugPanel'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Nota: OneSignal manejará su propio service worker (OneSignalSDKWorker.js)
  // No registramos sw.js aquí para evitar conflictos
  useEffect(() => {
    // Limpiar cualquier service worker anterior de /sw.js
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          // Solo desregistrar sw.js, no el de OneSignal
          if (registration.active && registration.active.scriptURL.includes('/sw.js')) {
            console.log('🗑️ Desregistrando sw.js para evitar conflictos con OneSignal')
            registration.unregister()
          }
        })
      })
    }
  }, [])

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <OneSignalProvider autoPrompt={true}>
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
        {/* Panel de debug de OneSignal (solo en desarrollo) */}
        <OneSignalDebugPanel />
      </OneSignalProvider>
    </SessionContextProvider>
  )
}