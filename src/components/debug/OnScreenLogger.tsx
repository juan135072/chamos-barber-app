/**
 * =====================================================
 * 📱 ON-SCREEN LOGGER FOR PWA
 * =====================================================
 * Muestra los logs en pantalla para dispositivos móviles
 */

'use client'

import { useEffect, useState } from 'react'

interface LogEntry {
    timestamp: string
    type: 'log' | 'warn' | 'error'
    message: string
    data?: any
}

export default function OnScreenLogger() {
    const [isOpen, setIsOpen] = useState(false)
    const [logs, setLogs] = useState<LogEntry[]>([])

    useEffect(() => {
        // Capturar console.log, console.warn, console.error
        const originalLog = console.log
        const originalWarn = console.warn
        const originalError = console.error

        const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
            const timestamp = new Date().toLocaleTimeString('es-CL')
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')

            // Solo capturar logs relacionados con OneSignal
            if (message.includes('OneSignal') || message.includes('DEBUG') || message.includes('AUTOFIX')) {
                setLogs(prev => [...prev.slice(-49), { timestamp, type, message }])
            }
        }

        console.log = (...args) => {
            originalLog(...args)
            addLog('log', args)
        }

        console.warn = (...args) => {
            originalWarn(...args)
            addLog('warn', args)
        }

        console.error = (...args) => {
            originalError(...args)
            addLog('error', args)
        }

        // Cleanup
        return () => {
            console.log = originalLog
            console.warn = originalWarn
            console.error = originalError
        }
    }, [])

    const clearLogs = () => setLogs([])

    const getLogColor = (type: string) => {
        switch (type) {
            case 'error': return '#ef4444'
            case 'warn': return '#f59e0b'
            default: return '#10b981'
        }
    }

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'error': return '❌'
            case 'warn': return '⚠️'
            default: return '📝'
        }
    }

    return (
        <>
            {/* Botón flotante */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: isOpen ? '420px' : '90px',
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '50%',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                    cursor: 'pointer',
                    zIndex: 99997,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    transition: 'all 0.3s ease'
                }}
            >
                {isOpen ? '✖️' : '📱'}
                {logs.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {logs.length}
                    </span>
                )}
            </button>

            {/* Panel de logs */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    left: '20px',
                    height: '380px',
                    background: '#1a1a1a',
                    border: '2px solid #8b5cf6',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    zIndex: 99996,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                            📱 Debug Logger PWA
                        </h3>
                        <button
                            onClick={clearLogs}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 12px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            🗑️ Limpiar
                        </button>
                    </div>

                    {/* Logs */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '12px',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                    }}>
                        {logs.length === 0 ? (
                            <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', paddingTop: '40px' }}>
                                📭 No hay logs aún...<br />
                                <span style={{ fontSize: '10px' }}>Los logs de OneSignal aparecerán aquí</span>
                            </div>
                        ) : (
                            logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: '8px',
                                        padding: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '6px',
                                        borderLeft: `3px solid ${getLogColor(log.type)}`
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '4px'
                                    }}>
                                        <span>{getLogIcon(log.type)}</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                                            {log.timestamp}
                                        </span>
                                    </div>
                                    <pre style={{
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: '11px'
                                    }}>
                                        {log.message}
                                    </pre>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
