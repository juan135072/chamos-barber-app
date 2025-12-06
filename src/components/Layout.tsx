import React from 'react'
import Head from 'next/head'
import Navbar from './Navbar'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  transparentNav?: boolean
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'Chamos Barber - Barbería en San Fernando, Chile',
  description = 'La mejor experiencia de barbería en San Fernando, Chile. Cortes profesionales, afeitado premium y atención personalizada.',
  transparentNav = false
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="barbería, San Fernando, Chile, corte de cabello, afeitado, estilo, barber, barbería San Fernando" />
        <meta name="author" content="Chamos Barber" />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_ES" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>
      
      <Navbar transparent={transparentNav} />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout