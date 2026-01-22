/**
 * =====================================================
 * ☢️ ONE SIGNAL RESET BUTTON
 * =====================================================
 * Botón para resetear OneSignal cuando hay problemas
 */

'use client'

import { useState } from 'react'

export default function OneSignalResetButton() {
    const [showInfo, setShowInfo] = useState(false)

    const nuclearReset = async () => {
        if (!confirm('⚠️ RESETEO DE NOTIFICACIONES ⚠️\n\n¿No te llegan las notificaciones?\n\nEste botón solucionará el problema, pero:\n• Se cerrarán todas las pestañas de esta página\n• Tendrás que volver a aceptar los permisos\n\n¿Continuar?')) {
            return
        }

        console.log('☢️ [RESET] Iniciando reseteo de notificaciones...')

        try {
            // 1. Desregistrar service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                for (const registration of registrations) {
                    await registration.unregister()
                }
            }

            // 2. Limpiar IndexedDB
            if ('indexedDB' in window) {
                const dbs = await indexedDB.databases()
                dbs.forEach((db) => {
                    if (db.name) {
                        indexedDB.deleteDatabase(db.name)
                    }
                })
            }

            // 3. Limpiar caché
            if ('caches' in window) {
                const cacheNames = await caches.keys()
                await Promise.all(cacheNames.map(name => caches.delete(name)))
            }

            // 4. Limpiar storage
            localStorage.clear()
            sessionStorage.clear()

            console.log('✅ [RESET] Completado. Recargando...')

            // 5. Recargar
            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (error) {
            console.error('❌ [RESET] Error:', error)
            alert('Error al resetear. Por favor contacta a soporte.')
        }
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            zIndex: 99999
        }}>
            {/* Botón de información */}
            <button
                onClick={() => setShowInfo(!showInfo)}
                style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: 'none',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100001
                }}
            >
                ?
            </button>

            {/* Panel de información */}
            {showInfo && (
                <div style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '0',
                    width: '280px',
                    background: '#1a1a1a',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    fontSize: '13px',
                    lineHeight: '1.5'
                }}>
                    <button
                        onClick={() => setShowInfo(false)}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ✕
                    </button>
                    <h4 style={{ margin: '0 0 12px 0', color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>
                        ☢️ ¿Cuándo usar este botón?
                    </h4>
                    <p style={{ margin: '0 0 10px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                        <strong>Úsalo solo si:</strong>
                    </p>
                    <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        <li>No te llegan las notificaciones de nuevas citas</li>
                        <li>El ícono de campana muestra un error</li>
                    </ul>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        <strong>Nota:</strong> Después de usarlo, debes volver a aceptar los permisos de notificación.
                    </p>
                </div>
            )}

            {/* Botón principal */}
            <button
                onClick={nuclearReset}
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}
            >
                ☢️
            </button>
        </div>
    )
}
