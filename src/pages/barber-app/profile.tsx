// ================================================================
// 📱 PÁGINA: Barber App - Perfil del Barbero
// Perfil con toggle de disponibilidad
// ================================================================

import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Mail, Phone, Instagram, LogOut, User, Calendar, DollarSign } from 'lucide-react'
import { useBarberAppAuth } from '../../hooks/useBarberAppAuth'
import { useDisponibilidad } from '../../hooks/useDisponibilidad'
import BarberAppLayout from '../../components/barber-app/layout/BarberAppLayout'
import LoadingSpinner from '../../components/barber-app/shared/LoadingSpinner'

export default function ProfilePage() {
  const router = useRouter()
  const { session, loading: authLoading, error: authError, barbero, signOut } = useBarberAppAuth()
  const { disponibilidad, loading: dispLoading, toggle } = useDisponibilidad(session?.barberoId || null)

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await signOut()
      router.push('/login')
    }
  }

  // Mostrar loading mientras autentica
  if (authLoading) {
    return <LoadingSpinner text="Cargando perfil..." fullScreen />
  }

  // Mostrar error de autenticación
  if (authError || !session || !barbero) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Acceso Denegado</h2>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>{authError || 'No tienes permisos para acceder'}</p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '1rem 2rem',
              background: '#D4AF37',
              border: 'none',
              borderRadius: '12px',
              color: '#121212',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Perfil - Barber App</title>
        <meta name="description" content="Perfil del barbero" />
      </Head>

      <BarberAppLayout barbero={barbero} currentPage="profile">
        <div className="profile-container">
          {/* Avatar y nombre */}
          <div className="profile-header">
            <div className="avatar-wrapper">
              {barbero.imagen_url ? (
                <img src={barbero.imagen_url} alt={barbero.nombre} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <User size={48} />
                </div>
              )}
            </div>
            <h1 className="profile-name">
              {barbero.nombre} {barbero.apellido}
            </h1>
            {barbero.especialidades && barbero.especialidades.length > 0 && (
              <div className="especialidades">
                {barbero.especialidades.map((esp, idx) => (
                  <span key={idx} className="especialidad-badge">
                    {esp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggle de disponibilidad */}
          <div className="card disponibilidad-card">
            <h3 className="card-title">Estado de Disponibilidad</h3>
            <div className="disponibilidad-toggle">
              <div className="disponibilidad-info">
                <span className={`status-dot ${disponibilidad ? 'disponible' : 'ocupado'}`}></span>
                <span className="status-text">
                  {disponibilidad ? 'Disponible' : 'Ocupado/Descanso'}
                </span>
              </div>
              <button
                className={`toggle-btn ${disponibilidad ? 'active' : ''}`}
                onClick={() => toggle(!disponibilidad)}
                disabled={dispLoading}
              >
                <div className="toggle-slider"></div>
              </button>
            </div>
            <p className="disponibilidad-help">
              {disponibilidad 
                ? 'Los clientes pueden agendar citas contigo' 
                : 'No recibirás nuevas citas hasta que te pongas disponible'}
            </p>
          </div>

          {/* Información de contacto */}
          <div className="card contact-card">
            <h3 className="card-title">Información de Contacto</h3>
            <div className="contact-list">
              {barbero.email && (
                <div className="contact-item">
                  <Mail size={20} />
                  <span>{barbero.email}</span>
                </div>
              )}
              {barbero.telefono && (
                <div className="contact-item">
                  <Phone size={20} />
                  <span>{barbero.telefono}</span>
                </div>
              )}
              {barbero.instagram && (
                <div className="contact-item">
                  <Instagram size={20} />
                  <span>@{barbero.instagram}</span>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          {barbero.descripcion && (
            <div className="card description-card">
              <h3 className="card-title">Sobre mí</h3>
              <p className="description-text">{barbero.descripcion}</p>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="card actions-card">
            <h3 className="card-title">Acciones Rápidas</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={() => router.push('/barber-app')}>
                <Calendar size={24} />
                <span>Ver Agenda</span>
              </button>
              <button className="action-btn" onClick={() => router.push('/barber-app/history')}>
                <DollarSign size={24} />
                <span>Ver Historial</span>
              </button>
            </div>
          </div>

          {/* Botón de cerrar sesión */}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <style jsx>{`
          .profile-container {
            width: 100%;
            padding-bottom: 2rem;
          }

          .profile-header {
            text-align: center;
            margin-bottom: 2rem;
          }

          .avatar-wrapper {
            width: 120px;
            height: 120px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            overflow: hidden;
            border: 4px solid #D4AF37;
            box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
          }

          .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(244, 208, 63, 0.2) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #D4AF37;
          }

          .profile-name {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 1rem 0;
          }

          .especialidades {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            justify-content: center;
          }

          .especialidad-badge {
            padding: 0.375rem 0.875rem;
            background: rgba(212, 175, 55, 0.15);
            border: 1px solid rgba(212, 175, 55, 0.3);
            border-radius: 20px;
            color: #D4AF37;
            font-size: 0.813rem;
            font-weight: 600;
          }

          .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .card-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 1.25rem 0;
          }

          .disponibilidad-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .disponibilidad-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ef4444;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
            animation: pulse 2s infinite;
          }

          .status-dot.disponible {
            background: #10b981;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }

          .status-text {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
          }

          .toggle-btn {
            position: relative;
            width: 56px;
            height: 32px;
            background: rgba(239, 68, 68, 0.2);
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0;
          }

          .toggle-btn.active {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.4);
          }

          .toggle-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 24px;
            height: 24px;
            background: #ef4444;
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .toggle-btn.active .toggle-slider {
            transform: translateX(24px);
            background: #10b981;
          }

          .disponibilidad-help {
            font-size: 0.813rem;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.5;
            margin: 0;
          }

          .contact-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.938rem;
          }

          .contact-item :global(svg) {
            color: #D4AF37;
            flex-shrink: 0;
          }

          .description-text {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.938rem;
            line-height: 1.6;
            margin: 0;
          }

          .action-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 1.25rem 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(212, 175, 55, 0.3);
            border-radius: 12px;
            color: #D4AF37;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .action-btn:hover {
            background: rgba(212, 175, 55, 0.1);
            border-color: #D4AF37;
            transform: translateY(-2px);
          }

          .action-btn :global(svg) {
            color: #D4AF37;
          }

          .logout-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            color: #ef4444;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1.5rem;
          }

          .logout-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: #ef4444;
          }

          .logout-btn:active {
            transform: scale(0.98);
          }

          @media (max-width: 360px) {
            .profile-name {
              font-size: 1.25rem;
            }

            .avatar-wrapper {
              width: 100px;
              height: 100px;
            }

            .card {
              padding: 1.25rem;
            }

            .action-buttons {
              gap: 0.75rem;
            }

            .action-btn {
              padding: 1rem 0.75rem;
              font-size: 0.813rem;
            }
          }
        `}</style>
      </BarberAppLayout>
    </>
  )
}
