import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chamos Barber | Barbería Premium Venezuela-Chile',
  description: 'La mejor barbería con estilo venezolano-chileno. Cortes premium, afeitado clásico y experiencia única en Santiago.',
  keywords: 'barbería, cortes de cabello, afeitado, venezolano, chileno, Santiago, premium',
  openGraph: {
    title: 'Chamos Barber | Barbería Premium Venezuela-Chile',
    description: 'La mejor barbería con estilo venezolano-chileno.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}