import { useEffect, useState } from 'react'
import Image from 'next/image'

interface PreloaderProps {
  onComplete?: () => void
  duration?: number // Duración en milisegundos
}

export default function Preloader({ onComplete, duration = 3000 }: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Simular carga progresiva
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 2
      })
    }, duration / 50)

    // Ocultar después de completar
    const timeout = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) {
        setTimeout(onComplete, 500) // Esperar animación de salida
      }
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div
      className="preloader-container"
      style={{
        opacity: progress >= 100 ? 0 : 1,
        transition: 'opacity 0.5s ease-out'
      }}
    >
      {/* Fondo oscuro liso (nuevo estilo Inspirar) */}
      <div className="preloader-background" />

      {/* Contenedor principal */}
      <div className="preloader-content">
        
        {/* Nuevo Logo tipográfico construido con CSS y la imagen de la marca */}
        <div className="logo-section">
          <div className="logo-glow" />
          <div className="logo-flex flex-col items-center gap-6">
            <div className="logo-image-container">
              <Image 
                src="/chamos-logo.png" 
                alt="Chamos Barber" 
                width={120} 
                height={120}
                priority
                className="logo-image"
              />
            </div>
            <h1 className="brand-name">
              CHAMOS<span className="text-gold">.</span>
            </h1>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>

        {/* Mensaje de carga */}
        <div className="loading-message">
          <span className="dot">•</span>
          <span className="dot">•</span>
          <span className="dot">•</span>
        </div>
      </div>

      <style jsx>{`
        .preloader-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .preloader-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #080808; /* Color Dark de Inspirar */
        }

        .preloader-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 50px;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-section {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 150px;
          background: radial-gradient(ellipse, rgba(197, 160, 89, 0.15) 0%, transparent 70%);
          animation: glowPulse 2s ease-in-out infinite;
          filter: blur(20px);
          pointer-events: none;
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .logo-flex {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 1;
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        .logo-image-container {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 4px 20px rgba(197, 160, 89, 0.2));
        }

        .logo-image {
          /* Filtros para convertir el amarillo viejo (#D4AF37) al nuevo dorado (#C5A059) */
          /* Hue shift de -10deg, reducir saturación y ligeramente ajustar brillo */
          filter: hue-rotate(-10deg) saturate(0.65) brightness(1.05);
          object-fit: contain;
        }

        .brand-name {
          font-size: 3rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          color: #FFFFFF;
          margin: 0;
        }

        .text-gold {
          color: #C5A059;
        }

        .tagline {
          color: #C5A059;
          font-size: 0.9rem;
          margin: 0;
          letter-spacing: 0.4em;
          font-weight: 500;
          animation: fadeIn 1s ease-out 0.5s both;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .progress-container {
          width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: slideUp 1s ease-out 0.6s both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-bar {
          width: 100%;
          height: 2px;
          background: rgba(197, 160, 89, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #C5A059;
          border-radius: 2px;
          transition: width 0.3s ease;
          box-shadow: 0 0 10px rgba(197, 160, 89, 0.5);
        }

        .progress-text {
          color: #C5A059;
          font-size: 0.85rem;
          font-weight: 500;
          margin: 0;
          letter-spacing: 0.1em;
        }

        .loading-message {
          display: flex;
          gap: 8px;
          animation: fadeIn 1s ease-out 0.8s both;
        }

        .dot {
          color: #C5A059;
          font-size: 1.5rem;
          animation: dotBounce 1.4s ease-in-out infinite;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          40% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .brand-name {
            font-size: 2.2rem;
          }

          .logo-image-container {
            transform: scale(0.8);
          }

          .tagline {
            font-size: 0.8rem;
            letter-spacing: 0.3em;
          }

          .progress-container {
            width: 250px;
          }
        }

        @media (max-width: 480px) {
          .brand-name {
            font-size: 1.8rem;
          }

          .logo-image-container {
            transform: scale(0.65);
          }

          .progress-container {
            width: 200px;
          }
        }
      `}</style>
    </div>
  )
}
