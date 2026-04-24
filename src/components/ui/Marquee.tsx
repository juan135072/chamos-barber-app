import React from 'react'

interface MarqueeProps {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children?: React.ReactNode
  vertical?: boolean
  repeat?: number
}

export function Marquee({
  className = '',
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 3,
}: MarqueeProps) {
  const containerClass = [
    'group flex overflow-hidden [--duration:40s] [--gap:1rem] [gap:var(--gap)]',
    vertical ? 'flex-col' : 'flex-row',
    className,
  ].join(' ')

  const innerClass = [
    'flex shrink-0 justify-around [gap:var(--gap)]',
    vertical ? 'flex-col animate-marquee-vertical' : 'flex-row animate-marquee',
    pauseOnHover ? 'group-hover:[animation-play-state:paused]' : '',
    reverse ? '[animation-direction:reverse]' : '',
  ].join(' ')

  return (
    <div className={containerClass}>
      {Array.from({ length: repeat }).map((_, i) => (
        <div key={i} className={innerClass}>
          {children}
        </div>
      ))}
    </div>
  )
}
