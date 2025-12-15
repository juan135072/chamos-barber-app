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
      {/* Fondo con degradado */}
      <div className="preloader-background" />

      {/* Contenedor principal */}
      <div className="preloader-content">
        {/* Logo animado */}
        <div className="logo-container">
          <div className="logo-glow" />
          <Image
            src="/chamos-logo.png"
            alt="Chamos Barber"
            width={200}
            height={100}
            priority
            className="logo-image"
          />
        </div>

        {/* Texto animado */}
        <div className="text-container">
          <h1 className="brand-name">CHAMOS BARBER</h1>
          <p className="tagline">Barbería Profesional</p>
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
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
          animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .preloader-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
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

        .logo-container {
          position: relative;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
          animation: glowPulse 2s ease-in-out infinite;
          filter: blur(30px);
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        .logo-image {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5));
          animation: logoRotate 20s linear infinite;
        }

        @keyframes logoRotate {
          from {
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5)) hue-rotate(0deg);
          }
          to {
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5)) hue-rotate(360deg);
          }
        }

        .text-container {
          text-align: center;
          animation: textFadeIn 1s ease-out 0.3s both;
        }

        @keyframes textFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .brand-name {
          font-size: 2.5rem;
          font-weight: 900;
          letter-spacing: 4px;
          background: linear-gradient(135deg, #D4AF37 0%, #F4E5A0 50%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          text-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .tagline {
          color: #999;
          font-size: 1rem;
          margin: 10px 0 0 0;
          letter-spacing: 2px;
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
          gap: 10px;
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
          height: 4px;
          background: rgba(212, 175, 55, 0.2);
          border-radius: 2px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #D4AF37 0%, #F4E5A0 50%, #D4AF37 100%);
          background-size: 200% 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
          animation: progressShine 2s linear infinite;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
        }

        @keyframes progressShine {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .progress-text {
          color: #D4AF37;
          font-size: 0.9rem;
          font-weight: bold;
          margin: 0;
          font-family: 'Courier New', monospace;
        }

        .loading-message {
          display: flex;
          gap: 8px;
          animation: fadeIn 1s ease-out 0.8s both;
        }

        .dot {
          color: #D4AF37;
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
            opacity: 0.5;
          }
          40% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .brand-name {
            font-size: 2rem;
            letter-spacing: 3px;
          }

          .tagline {
            font-size: 0.9rem;
          }

          .progress-container {
            width: 250px;
          }

          .logo-image {
            width: 150px;
            height: auto;
          }

          .logo-glow {
            width: 200px;
            height: 200px;
          }
        }

        @media (max-width: 480px) {
          .brand-name {
            font-size: 1.5rem;
            letter-spacing: 2px;
          }

          .progress-container {
            width: 200px;
          }
        }
      `}</style>
    </div>
  )
}
