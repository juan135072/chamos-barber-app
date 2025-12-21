import React from 'react'
import { Clock, User, Scissors } from 'lucide-react'
import { Cita } from '@/types/barber-app'

interface ProximaCitaCardProps {
    cita: Cita | null
    loading: boolean
}

export default function ProximaCitaCard({ cita, loading }: ProximaCitaCardProps) {
    if (loading) return <div className="skeleton-card" />
    if (!cita) return null

    return (
        <div className="proxima-cita-container">
            <div className="card-tag">PRÓXIMA CITA</div>
            <div className="cita-main">
                <div className="time-box">
                    <Clock size={16} />
                    <span>{cita.hora}</span>
                </div>
                <div className="client-info">
                    <span className="client-name">{cita.cliente_nombre}</span>
                    <span className="service-name">
                        <Scissors size={14} style={{ marginRight: '4px' }} />
                        {cita.servicio_nombre || 'Servicio'}
                    </span>
                </div>
            </div>

            <style jsx>{`
        .proxima-cita-container {
          background: linear-gradient(135deg, #1e1e1e 0%, #121212 100%);
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 20px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .card-tag {
          position: absolute;
          top: -10px;
          right: 20px;
          background: #D4AF37;
          color: #000;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
          letter-spacing: 0.05em;
        }

        .cita-main {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .time-box {
          background: rgba(212, 175, 55, 0.1);
          border: 1px solid rgba(212, 175, 55, 0.2);
          padding: 0.75rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #D4AF37;
          font-weight: 700;
          min-width: 70px;
        }

        .client-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .client-name {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .service-name {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
        }

        .skeleton-card {
          height: 100px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          margin-bottom: 1.5rem;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
        </div>
    )
}
