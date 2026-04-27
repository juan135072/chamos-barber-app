import { useRef, useState } from 'react'
import Image from 'next/image'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

interface PreloaderProps {
  onComplete?: () => void
  duration?: number
}

export default function Preloader({ onComplete, duration = 3200 }: PreloaderProps) {
  const [mounted, setMounted] = useState(true)

  const containerRef  = useRef<HTMLDivElement>(null)
  const logoRef       = useRef<HTMLDivElement>(null)
  const scanLineRef   = useRef<HTMLDivElement>(null)
  const counterRef    = useRef<HTMLSpanElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const panel1Ref     = useRef<HTMLDivElement>(null)
  const panel2Ref     = useRef<HTMLDivElement>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const fillDuration = Math.max((duration / 1000) - 2.2, 0.6)

    // ── Initial states ──────────────────────────────────────
    gsap.set(logoRef.current,     { clipPath: 'inset(0 100% 0 0)' })
    gsap.set(scanLineRef.current, { left: '-2px', opacity: 0 })
    gsap.set(counterRef.current,  { opacity: 0 })
    gsap.set(progressRef.current, { scaleX: 0, transformOrigin: 'left center' })
    gsap.set(bottomRef.current,   { opacity: 0, y: 10 })

    // ── Main timeline ───────────────────────────────────────
    const tl = gsap.timeline()

    // 1. Scan line appears
    tl.to(scanLineRef.current, { opacity: 1, duration: 0.15, ease: 'none' })

    // 2. Logo draws + scan line sweeps in sync
    tl.to(logoRef.current, {
      clipPath: 'inset(0 0% 0 0)',
      duration: 1.1,
      ease: 'power2.inOut',
    })
    tl.to(scanLineRef.current, {
      left: '100%',
      duration: 1.1,
      ease: 'power2.inOut',
    }, '<')

    // 3. Scan line fades, bottom section slides in
    tl.to(scanLineRef.current, { opacity: 0, duration: 0.25 })
    tl.to(bottomRef.current,   { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.1')
    tl.to(counterRef.current,  { opacity: 1, duration: 0.3 }, '<')

    // 4. Progress fills over remaining time
    tl.to(progressRef.current, {
      scaleX: 1,
      duration: fillDuration,
      ease: 'power1.inOut',
    })

    // 5. Exit — split panels open
    tl.to([logoRef.current, bottomRef.current], {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.out',
    })
    tl.to(panel1Ref.current, {
      yPercent: -100,
      duration: 0.75,
      ease: 'expo.inOut',
    }, '-=0.1')
    tl.to(panel2Ref.current, {
      yPercent: 100,
      duration: 0.75,
      ease: 'expo.inOut',
      onComplete: () => {
        setMounted(false)
        onComplete?.()
      },
    }, '<')

    // ── Counter (parallel) ─────────────────────────────────
    const obj = { val: 0 }
    gsap.to(obj, {
      val: 100,
      duration: fillDuration,
      delay: 1.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = String(Math.round(obj.val))
        }
      },
    })
  }, { scope: containerRef, dependencies: [] })

  if (!mounted) return null

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden' }}
    >
      {/* ── Split-exit panels ── */}
      <div
        ref={panel1Ref}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '51%', background: '#080808', zIndex: 4,
        }}
      />
      <div
        ref={panel2Ref}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '51%', background: '#080808', zIndex: 4,
        }}
      />

      {/* ── Background ── */}
      <div style={{ position: 'absolute', inset: 0, background: '#080808', zIndex: 0 }} />

      {/* ── Content ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '52px',
      }}>

        {/* Logo + scan line */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Vertical scan line */}
          <div
            ref={scanLineRef}
            style={{
              position: 'absolute',
              top: '-12%',
              height: '124%',
              width: '2px',
              background: 'linear-gradient(to bottom, transparent 0%, #C5A059 40%, #C5A059 60%, transparent 100%)',
              boxShadow: '0 0 18px rgba(197,160,89,0.9), 0 0 40px rgba(197,160,89,0.3)',
              zIndex: 10,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
          {/* Logo with clip reveal */}
          <div ref={logoRef}>
            <Image
              src="/chamos-logo-gold.png"
              alt="Chamos Barber"
              width={210}
              height={210}
              priority
              style={{ objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>

        {/* Counter + progress */}
        <div
          ref={bottomRef}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            width: '240px',
          }}
        >
          {/* Percentage counter */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              ref={counterRef}
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '3.2rem',
                fontWeight: 300,
                color: '#C5A059',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                minWidth: '3ch',
                textAlign: 'right',
              }}
            >
              0
            </span>
            <span style={{
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              color: 'rgba(197,160,89,0.4)',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>%</span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '1px',
            background: 'rgba(197,160,89,0.1)',
            overflow: 'hidden',
          }}>
            <div
              ref={progressRef}
              style={{
                height: '100%',
                background: 'linear-gradient(to right, #C5A059, #e0c050)',
                boxShadow: '0 0 10px rgba(197,160,89,0.7)',
              }}
            />
          </div>

          <span style={{
            fontSize: '0.5rem',
            letterSpacing: '0.35em',
            color: 'rgba(197,160,89,0.25)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            Cargando
          </span>
        </div>
      </div>
    </div>
  )
}
